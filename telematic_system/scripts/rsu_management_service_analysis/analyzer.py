import math
from collections import defaultdict
from datetime import timezone
from typing import Any, Dict, List

from models import LogMessage


def _extract_tru_topic(payload: dict) -> str:
    return payload.get("topic", "unknown")


def _extract_rsu_ip_from_tru(payload: dict, metadata: dict) -> str | None:
    rsu = metadata.get("rsu")
    if isinstance(rsu, dict):
        return rsu.get("ip")
    topic = payload.get("topic", "")
    if "rsu." in topic:
        parts = topic.split("rsu.")[1].split(".")
        if parts:
            return parts[0].replace("_", ".")
    return None


def _compute_latency_stats(values: list[float]) -> dict:
    if not values:
        return {}
    sorted_vals = sorted(values)
    n = len(sorted_vals)
    mean = sum(sorted_vals) / n
    variance = sum((x - mean) ** 2 for x in sorted_vals) / n
    return {
        "count": n,
        "mean_ms": mean,
        "std_ms": math.sqrt(variance),
        "p75_ms": sorted_vals[max(0, min(n - 1, int(n * 0.75)))],
        "p95_ms": sorted_vals[max(0, min(n - 1, int(n * 0.95)))],
        "min_ms": sorted_vals[0],
        "max_ms": sorted_vals[-1],
    }


def _rsu_latency_ms(msg: LogMessage) -> float | None:
    if not msg.timestamp or not msg.payload:
        return None
    influx_ts_ms = msg.payload.get("influx_timestamp")
    if not influx_ts_ms:
        return None

    log_dt = msg.timestamp

    log_ms = log_dt.timestamp() * 1000.0
    return log_ms - float(influx_ts_ms)


def analyze_system_performance(all_messages: List[LogMessage]) -> Dict[str, Any]:
    tru_by_topic: Dict[str, Dict[str, LogMessage]] = defaultdict(dict)
    rsu_messages: Dict[str, LogMessage] = {}
    rsu_ip_counts: Dict[str, int] = defaultdict(int)

    for msg in all_messages:
        if msg.source_format == "tru_instance":
            if not (msg.payload and isinstance(msg.payload, dict)):
                continue
            data_content = msg.payload.get("data")
            if not isinstance(data_content, dict):
                continue
            metadata = data_content.get("metadata", {})
            tru_ts = metadata.get("timestamp")
            if not tru_ts:
                continue

            topic = _extract_tru_topic(msg.payload)
            tru_by_topic[topic][str(tru_ts)] = msg

            rsu_ip = _extract_rsu_ip_from_tru(msg.payload, metadata)
            if rsu_ip:
                rsu_ip_counts[rsu_ip] += 1

        elif msg.source_format == "rsu_management_service":
            if msg.message_type != "influx_line_built" or not msg.payload:
                continue
            influx_ts = msg.payload.get("influx_timestamp")
            if influx_ts:
                rsu_messages[str(influx_ts)] = msg
            rsu_ip = msg.payload.get("tags", {}).get("rsuIp")
            if rsu_ip:
                rsu_ip_counts[rsu_ip] += 1

    total_tru = sum(len(msgs) for msgs in tru_by_topic.values())
    tru_all_keys = {k for msgs in tru_by_topic.values() for k in msgs}

    total_matched = 0
    per_topic_drops: Dict[str, dict] = {}

    for topic, tru_msgs in tru_by_topic.items():
        timestamp_key_matched_count = sum(
            1 for ts_key in tru_msgs if ts_key in rsu_messages
        )
        total_matched += timestamp_key_matched_count

        topic_count = len(tru_msgs)
        topic_dropped = topic_count - timestamp_key_matched_count
        per_topic_drops[topic] = {
            "tru_published": topic_count,
            "rsu_published": timestamp_key_matched_count,
            "dropped": topic_dropped,
            "drop_pct": round((topic_dropped / topic_count) * 100.0, 3)
            if topic_count > 0
            else 0.0,
        }

    overall_dropped = total_tru - total_matched
    overall_drops = {
        "tru_published": total_tru,
        "rsu_published": total_matched,
        "dropped": overall_dropped,
        "drop_pct": round((overall_dropped / total_tru) * 100.0, 3)
        if total_tru > 0
        else 0.0,
    }

    unmatched_rsu_keys = rsu_messages.keys() - tru_all_keys

    for k in unmatched_rsu_keys:
        rsu_msg = rsu_messages[k]
        rsu_ip = (
            rsu_msg.payload.get("tags", {}).get("rsuIp") if rsu_msg.payload else None
        )
        if rsu_ip and rsu_ip in rsu_ip_counts:
            rsu_ip_counts[rsu_ip] -= 1
            if rsu_ip_counts[rsu_ip] <= 0:
                del rsu_ip_counts[rsu_ip]

    rsu_messages = {k: v for k, v in rsu_messages.items() if k in tru_all_keys}

    latencies: list[float] = []
    latency_timestamps = []

    for rsu_msg in rsu_messages.values():
        lat = _rsu_latency_ms(rsu_msg)
        if lat is None:
            continue
        latencies.append(lat)
        latency_timestamps.append(rsu_msg.timestamp)

    sorted_latencies = sorted(latencies)
    latency_stats = _compute_latency_stats(sorted_latencies)

    tru_msgs = [
        msg
        for msg in all_messages
        if msg.source_format == "tru_instance" and msg.timestamp
    ]

    rsu_msgs = [msg for msg in rsu_messages.values() if msg.timestamp]

    tru_throughput_bps = 0.0
    rsu_throughput_bps = 0.0

    if tru_msgs:
        tru_timestamps = [msg.timestamp for msg in tru_msgs]
        duration = (max(tru_timestamps) - min(tru_timestamps)).total_seconds()
        if duration > 0:
            total_tru_bytes = sum(
                getattr(msg, "bytes_size", 0) or 0 for msg in tru_msgs
            )
            tru_throughput_bps = total_tru_bytes / duration

    if rsu_msgs:
        rsu_timestamps = [msg.timestamp for msg in rsu_msgs]
        duration = (max(rsu_timestamps) - min(rsu_timestamps)).total_seconds()
        if duration > 0:
            total_rsu_bytes = sum(
                getattr(msg, "bytes_size", 0) or 0 for msg in rsu_msgs
            )
            rsu_throughput_bps = total_rsu_bytes / duration

    return {
        "tru_count": len(tru_msgs),
        "mgmt_count": len(rsu_msgs),
        "rsu_ip_counts": dict(rsu_ip_counts),
        "raw_latencies": latencies,
        "latency_stats": latency_stats,
        "latency_timestamps": latency_timestamps,
        "drops": {
            "overall": overall_drops,
            "per_topic": per_topic_drops,
        },
        "throughput_stats": {
            "tru_bytes_per_sec": tru_throughput_bps,
            "rsu_bytes_per_sec": rsu_throughput_bps,
        },
    }
