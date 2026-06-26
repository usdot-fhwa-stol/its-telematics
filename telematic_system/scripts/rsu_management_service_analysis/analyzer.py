import math
from collections import defaultdict
from typing import Any, Dict, List, Optional

from models import LogMessage


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _extract_topic(payload: dict) -> str:
    return payload.get("topic", "unknown")


def _extract_rsu_ip_from_tru(payload: dict, metadata: dict) -> Optional[str]:
    rsu = metadata.get("rsu")
    if isinstance(rsu, dict):
        return rsu.get("ip")
    topic = payload.get("topic", "")
    if "rsu." in topic:
        parts = topic.split("rsu.")[1].split(".")
        if parts:
            return parts[0].replace("_", ".")
    return None


def _percentile(sorted_vals: list[float], p: float) -> float:
    n = len(sorted_vals)
    return sorted_vals[max(0, min(n - 1, int(n * p)))]


def _compute_stats(values: list[float]) -> dict:
    """Generic descriptive stats. Works for latency (ms) or throughput (KB/s)."""
    if not values:
        return {}
    sorted_vals = sorted(values)
    n = len(sorted_vals)
    mean = sum(sorted_vals) / n
    variance = sum((x - mean) ** 2 for x in sorted_vals) / n
    return {
        "count": n,
        "mean": mean,
        "std": math.sqrt(variance),
        "min": sorted_vals[0],
        "p75": _percentile(sorted_vals, 0.75),
        "p95": _percentile(sorted_vals, 0.95),
        "max": sorted_vals[-1],
    }


def _latency_ms(rsu_msg: LogMessage) -> Optional[float]:
    """End-to-end latency: log timestamp minus the embedded influx timestamp."""
    if not rsu_msg.timestamp or not rsu_msg.payload:
        return None
    influx_ts_ms = rsu_msg.payload.get("influx_timestamp")
    if not influx_ts_ms:
        return None
    return rsu_msg.timestamp.timestamp() * 1000.0 - float(influx_ts_ms)


def _compute_throughput(
    messages: list[LogMessage],
    source_format: str,
    message_type: Optional[str] = None,
) -> tuple[list[tuple], dict]:
    """
    Bucket message bytes by wall-clock second.

    Returns
    -------
    series : list of (datetime, kb_per_second) sorted by time
    stats  : descriptive stats dict with keys  mean/std/min/p75/p95/max (KB/s)
    """
    by_second: dict = defaultdict(float)
    for msg in messages:
        if msg.source_format != source_format:
            continue
        if message_type is not None and msg.message_type != message_type:
            continue
        if not msg.timestamp:
            continue
        kb = (getattr(msg, "bytes_size", 0) or 0) / 1024.0
        second = msg.timestamp.replace(microsecond=0)
        by_second[second] += kb

    if not by_second:
        return [], {}

    series = sorted(by_second.items())
    stats = _compute_stats(list(by_second.values()))
    return series, stats


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def analyze_system_performance(all_messages: List[LogMessage]) -> Dict[str, Any]:
    # ---- Pass 1: bucket messages by type ----------------------------------

    # tru_by_topic[topic][str(influx_ts)] = LogMessage
    tru_by_topic: Dict[str, Dict[str, LogMessage]] = defaultdict(dict)
    # rsu_by_influx_ts[str(influx_ts)] = LogMessage  (influx_line_built only)
    rsu_by_influx_ts: Dict[str, LogMessage] = {}
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

            topic = _extract_topic(msg.payload)
            tru_by_topic[topic][str(tru_ts)] = msg

            rsu_ip = _extract_rsu_ip_from_tru(msg.payload, metadata)
            if rsu_ip:
                rsu_ip_counts[rsu_ip] += 1

        elif msg.source_format == "rsu_management_service":
            if msg.message_type != "influx_line_built" or not msg.payload:
                continue
            influx_ts = msg.payload.get("influx_timestamp")
            if influx_ts:
                rsu_by_influx_ts[str(influx_ts)] = msg
            rsu_ip = msg.payload.get("tags", {}).get("rsuIp")
            if rsu_ip:
                rsu_ip_counts[rsu_ip] += 1

    # ---- Pass 2: drop analysis (match TRU → RSU by influx timestamp) ------

    tru_all_keys = {k for msgs in tru_by_topic.values() for k in msgs}
    total_tru = sum(len(msgs) for msgs in tru_by_topic.values())
    total_matched = 0
    per_topic_drops: Dict[str, dict] = {}

    for topic, tru_msgs in tru_by_topic.items():
        matched = sum(1 for ts_key in tru_msgs if ts_key in rsu_by_influx_ts)
        total_matched += matched
        dropped = len(tru_msgs) - matched
        per_topic_drops[topic] = {
            "tru_published": len(tru_msgs),
            "rsu_received": matched,
            "dropped": dropped,
            "drop_pct": round(dropped / len(tru_msgs) * 100.0, 3)
            if tru_msgs
            else 0.0,
        }

    overall_dropped = total_tru - total_matched
    overall_drops = {
        "tru_published": total_tru,
        "rsu_received": total_matched,
        "dropped": overall_dropped,
        "drop_pct": round(overall_dropped / total_tru * 100.0, 3)
        if total_tru > 0
        else 0.0,
    }

    # Remove RSU IP counts for RSU messages that had no matching TRU entry
    for ts_key, rsu_msg in rsu_by_influx_ts.items():
        if ts_key not in tru_all_keys:
            rsu_ip = (
                rsu_msg.payload.get("tags", {}).get("rsuIp")
                if rsu_msg.payload
                else None
            )
            if rsu_ip and rsu_ip in rsu_ip_counts:
                rsu_ip_counts[rsu_ip] -= 1
                if rsu_ip_counts[rsu_ip] <= 0:
                    del rsu_ip_counts[rsu_ip]

    # Only keep RSU messages that were matched
    matched_rsu_messages = {
        k: v for k, v in rsu_by_influx_ts.items() if k in tru_all_keys
    }

    # ---- Pass 3: latency --------------------------------------------------

    latencies: list[float] = []
    latency_timestamps = []
    for rsu_msg in matched_rsu_messages.values():
        lat = _latency_ms(rsu_msg)
        if lat is None:
            continue
        latencies.append(lat)
        latency_timestamps.append(rsu_msg.timestamp)

    latency_stats = _compute_stats(latencies)

    # ---- Pass 4: throughput -----------------------------------------------

    tru_throughput_series, tru_throughput_stats = _compute_throughput(
        all_messages, "tru_instance"
    )
    rsu_throughput_series, rsu_throughput_stats = _compute_throughput(
        all_messages, "rsu_management_service", message_type="influx_line_built"
    )

    # ---- Assemble result --------------------------------------------------

    return {
        # Counts consistent with the drop analysis
        "tru_count": total_tru,
        "rsu_count": len(matched_rsu_messages),
        "rsu_ip_counts": dict(rsu_ip_counts),
        "drops": {
            "overall": overall_drops,
            "per_topic": per_topic_drops,
        },
        "latency": {
            "raw": latencies,
            "timestamps": latency_timestamps,
            "stats": latency_stats,  # keys: count/mean/std/min/p75/p95/max
        },
        "throughput": {
            "tru": {
                "series": tru_throughput_series,  # [(datetime, kb/s), ...]
                "stats": tru_throughput_stats,    # keys: count/mean/std/min/p75/p95/max
            },
            "rsu": {
                "series": rsu_throughput_series,
                "stats": rsu_throughput_stats,
            },
        },
    }