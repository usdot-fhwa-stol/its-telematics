import math
from collections import defaultdict
from datetime import datetime
from typing import Any, Dict, List

from models import LogMessage


def _ms_within_minute(dt: datetime) -> float:
    return (dt.second * 1_000) + (dt.microsecond / 1_000)


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


def _compute_trimmed_latency_stats(sorted_latencies: list[float]) -> dict:
    n = len(sorted_latencies)
    if n == 0:
        return {}
    q1 = sorted_latencies[int(n * 0.25)]
    q3 = sorted_latencies[int(n * 0.75)]
    iqr = q3 - q1
    lower = q1 - 1.5 * iqr
    upper = q3 + 1.5 * iqr
    trimmed = [x for x in sorted_latencies if lower <= x <= upper]
    stats = _compute_latency_stats(trimmed)
    stats["outliers_removed"] = n - len(trimmed)
    return stats


def analyze_system_performance(all_messages: List[LogMessage]) -> Dict[str, Any]:
    """
    Analyzes system performance: data completeness (overall and per topic),
    end-to-end latency, and throughput statistics.
    """
    tru_by_topic: Dict[str, Dict[str, LogMessage]] = defaultdict(dict)
    rsu_messages: Dict[str, LogMessage] = {}

    rsu_ip_counts: Dict[str, int] = defaultdict(int)
    total_records_saved_to_db = 0

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
            total_records_saved_to_db += 1
            influx_ts = msg.payload.get("influx_timestamp")
            if influx_ts:
                rsu_messages[str(influx_ts)] = msg
            rsu_ip = msg.payload.get("tags", {}).get("rsuIp")
            if rsu_ip:
                rsu_ip_counts[rsu_ip] += 1

    stream_ordered_latencies: list[float] = []
    total_matched = 0
    total_tru = sum(len(msgs) for msgs in tru_by_topic.values())

    per_topic_completeness: Dict[str, dict] = {}

    for topic, tru_msgs in tru_by_topic.items():
        topic_matched = 0
        for ts_key, tru_msg in tru_msgs.items():
            if ts_key not in rsu_messages:
                continue
            topic_matched += 1
            total_matched += 1
            rsu_msg = rsu_messages[ts_key]

            tru_dt: datetime = tru_msg.timestamp
            rsu_dt: datetime = rsu_msg.timestamp
            if not (tru_dt and rsu_dt):
                continue

            diff_ms = _ms_within_minute(rsu_dt) - _ms_within_minute(tru_dt)
            if diff_ms < -30_000:
                diff_ms += 60_000
            elif diff_ms > 30_000:
                diff_ms -= 60_000

            stream_ordered_latencies.append(diff_ms)

        topic_count = len(tru_msgs)
        topic_dropped = topic_count - topic_matched
        per_topic_completeness[topic] = {
            "tru_published": topic_count,
            "rsu_received": topic_matched,
            "dropped": topic_dropped,
            "drop_rate_pct": round((topic_dropped / topic_count) * 100.0, 3)
            if topic_count > 0
            else 0.0,
            "completeness_pct": round((topic_matched / topic_count) * 100.0, 3)
            if topic_count > 0
            else 0.0,
        }

    overall_dropped = total_tru - total_matched
    overall_completeness = {
        "tru_published": total_tru,
        "rsu_received": total_matched,
        "dropped": overall_dropped,
        "drop_rate_pct": round((overall_dropped / total_tru) * 100.0, 3)
        if total_tru > 0
        else 0.0,
        "completeness_pct": round((total_matched / total_tru) * 100.0, 3)
        if total_tru > 0
        else 0.0,
    }

    sorted_latencies = sorted(stream_ordered_latencies)
    latency_stats = _compute_latency_stats(sorted_latencies)
    trimmed_latency_stats = _compute_trimmed_latency_stats(sorted_latencies)

    tru_timestamps = [
        msg.timestamp
        for msg in all_messages
        if msg.source_format == "tru_instance" and msg.timestamp
    ]
    rsu_timestamps = [
        msg.timestamp
        for msg in all_messages
        if msg.source_format == "rsu_management_service" and msg.timestamp
    ]

    tru_throughput_mps = 0.0
    rsu_throughput_mps = 0.0
    if tru_timestamps:
        duration = (max(tru_timestamps) - min(tru_timestamps)).total_seconds()
        if duration > 0:
            tru_throughput_mps = len(tru_timestamps) / duration
    if rsu_timestamps:
        duration = (max(rsu_timestamps) - min(rsu_timestamps)).total_seconds()
        if duration > 0:
            rsu_throughput_mps = len(rsu_timestamps) / duration

    return {
        "total_records_saved_to_db": total_records_saved_to_db,
        "rsu_ip_counts": dict(rsu_ip_counts),
        "raw_latencies": stream_ordered_latencies,
        "latency_stats": latency_stats,
        "trimmed_latency_stats": trimmed_latency_stats,
        "completeness": {
            "overall": overall_completeness,
            "per_topic": per_topic_completeness,
        },
        "throughput_stats": {
            "tru_msg_per_sec": tru_throughput_mps,
            "rsu_msg_per_sec": rsu_throughput_mps,
        },
    }
