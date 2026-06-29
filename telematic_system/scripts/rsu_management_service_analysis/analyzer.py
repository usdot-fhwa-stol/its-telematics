import math
from collections import defaultdict
from typing import Any, Dict, List, Optional, TypedDict

import numpy as np

from models import LogMessage


class Stats(TypedDict):
    count: int
    mean: float
    std: float
    min: float
    p75: float
    p95: float
    max: float


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


def _compute_stats(values: list[float]) -> Optional[Stats]:
    if not values:
        return None
    sorted_vals = sorted(values)
    n = len(sorted_vals)
    mean = sum(sorted_vals) / n
    variance = sum((x - mean) ** 2 for x in sorted_vals) / n
    return Stats(
        count=n,
        mean=mean,
        std=math.sqrt(variance),
        min=sorted_vals[0],
        p75=_percentile(sorted_vals, 0.75),
        p95=_percentile(sorted_vals, 0.95),
        max=sorted_vals[-1],
    )


def _pooled_std(
    ns: np.ndarray, means: np.ndarray, stds: np.ndarray
) -> float:
    total_n = ns.sum()
    if total_n <= 0:
        return float("nan")
    grand_mean = float(np.sum(ns * means) / total_n)
    pooled_var = float(
        np.sum(ns * (stds**2 + means**2)) / total_n - grand_mean**2
    )
    return float(np.sqrt(max(pooled_var, 0.0)))


def _latency_ms(rsu_msg: LogMessage) -> Optional[float]:
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
) -> tuple[list[tuple], Optional[Stats]]:
    by_second: dict = defaultdict(float)
    for msg in messages:
        if msg.source_format != source_format:
            continue
        if message_type is not None and msg.message_type != message_type:
            continue
        if not msg.timestamp:
            continue
        kb = (getattr(msg, "bytes_size", 0) or 0) / 1024.0
        by_second[msg.timestamp.replace(microsecond=0)] += kb

    if not by_second:
        return [], None

    return sorted(by_second.items()), _compute_stats(list(by_second.values()))


def analyze_run(all_messages: List[LogMessage]) -> Dict[str, Any]:
    tru_by_topic: Dict[str, Dict[str, LogMessage]] = defaultdict(dict)
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

    matched_rsu_messages = {
        k: v for k, v in rsu_by_influx_ts.items() if k in tru_all_keys
    }

    latencies: list[float] = []
    latency_timestamps = []
    for rsu_msg in matched_rsu_messages.values():
        lat = _latency_ms(rsu_msg)
        if lat is None:
            continue
        latencies.append(lat)
        latency_timestamps.append(rsu_msg.timestamp)

    tru_series, tru_stats = _compute_throughput(all_messages, "tru_instance")
    rsu_series, rsu_stats = _compute_throughput(
        all_messages, "rsu_management_service", message_type="influx_line_built"
    )

    return {
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
            "stats": _compute_stats(latencies),
        },
        "throughput": {
            "tru": {"series": tru_series, "stats": tru_stats},
            "rsu": {"series": rsu_series, "stats": rsu_stats},
        },
    }


def aggregate_runs(
    labeled_results: list[tuple[str, Dict[str, Any]]],
) -> Dict[str, Dict[str, Any]]:
    by_test: Dict[str, list[Dict[str, Any]]] = defaultdict(list)
    for test_id, result in labeled_results:
        by_test[test_id].append(result)

    aggregated: Dict[str, Dict[str, Any]] = {}

    for test_id, results in by_test.items():
        tru_published = sum(
            r["drops"]["overall"]["tru_published"] for r in results
        )
        rsu_received = sum(
            r["drops"]["overall"]["rsu_received"] for r in results
        )
        total_dropped = sum(r["drops"]["overall"]["dropped"] for r in results)
        drop_rate_pct = (
            round(total_dropped / tru_published * 100.0, 3)
            if tru_published > 0
            else 0.0
        )

        lat_weights = np.array(
            [r["drops"]["overall"]["rsu_received"] for r in results], dtype=float
        )
        lat_stats = [r["latency"]["stats"] for r in results]
        lat_means = np.array(
            [s["mean"] if s else float("nan") for s in lat_stats], dtype=float
        )
        lat_stds = np.array(
            [s["std"] if s else float("nan") for s in lat_stats], dtype=float
        )
        weighted_mean_latency = (
            float(np.average(lat_means, weights=lat_weights))
            if lat_weights.sum() > 0
            else float("nan")
        )
        max_latency = max(
            (s["max"] for s in lat_stats if s), default=float("nan")
        )

        rsu_tp_stats = [
            r["throughput"]["rsu"]["stats"]
            for r in results
            if r["throughput"]["rsu"]["stats"]
        ]
        tp_ns = np.array([s["count"] for s in rsu_tp_stats], dtype=float)
        tp_means = np.array([s["mean"] for s in rsu_tp_stats], dtype=float)
        tp_stds = np.array([s["std"] for s in rsu_tp_stats], dtype=float)
        weighted_mean_throughput = (
            float(np.average(tp_means, weights=tp_ns))
            if tp_ns.sum() > 0
            else float("nan")
        )

        aggregated[test_id] = {
            "runs_aggregated": len(results),
            "tru_published": tru_published,
            "rsu_received": rsu_received,
            "total_dropped": total_dropped,
            "drop_rate_pct": drop_rate_pct,
            "latency": {
                "mean_ms": round(weighted_mean_latency, 4),
                "pooled_std_ms": round(
                    _pooled_std(lat_weights, lat_means, lat_stds), 4
                ),
                "max_ms": round(max_latency, 4),
            },
            "throughput": {
                "mean_kbps": round(weighted_mean_throughput, 4),
                "pooled_std_kbps": round(
                    _pooled_std(tp_ns, tp_means, tp_stds), 4
                ),
                "min_kbps": round(
                    min((s["min"] for s in rsu_tp_stats), default=float("nan")), 4
                ),
                "max_kbps": round(
                    max((s["max"] for s in rsu_tp_stats), default=float("nan")), 4
                ),
                "sample_count": int(tp_ns.sum()),
            },
            "unique_rsus_seen": max(
                (len(r["rsu_ip_counts"]) for r in results), default=0
            ),
        }

    return aggregated