from typing import Any, Dict, List, cast

import numpy as np
from models import (
    InfluxBSMTraceRecord,
    InfluxWriteResult,
    LogMessage,
)
from parser import compute_latency_ms


def analyze_system_performance(messages: List[LogMessage]) -> Dict[str, Any]:
    latencies: List[int] = []
    rsu_msg_counts: Dict[str, int] = {}
    total_influx_written = 0
    status_updates: List[Dict[str, Any]] = []

    for msg in messages:
        if not msg.payload:
            continue

        if msg.message_type == "influx_line_built":
            payload = cast(InfluxBSMTraceRecord, msg.payload)
            latencies.append(
                compute_latency_ms(payload.source_timestamp, payload.influx_timestamp)
            )
            if payload.tags.rsu_ip:
                rsu_msg_counts[payload.tags.rsu_ip] = (
                    rsu_msg_counts.get(payload.tags.rsu_ip, 0) + 1
                )

        elif msg.message_type == "bsm_published":
            if msg.metadata and msg.metadata.rsu and msg.metadata.rsu.ip:
                rsu_ip = msg.metadata.rsu.ip
                rsu_msg_counts[rsu_ip] = rsu_msg_counts.get(rsu_ip, 0) + 1

        elif msg.message_type == "influx_batch_written":
            total_influx_written += cast(InfluxWriteResult, msg.payload).records_written

    lat_stats: Dict[str, float] = {}
    trimmed_lat_stats: Dict[str, float] = {}

    if latencies:
        arr = np.array(latencies, dtype=float)

        q1, q3 = np.percentile(arr, 25), np.percentile(arr, 75)
        iqr = q3 - q1
        trimmed = arr[(arr >= q1 - 1.5 * iqr) & (arr <= q3 + 1.5 * iqr)]

        lat_stats = {
            "mean_ms": float(np.mean(arr)),
            "max_ms": float(np.max(arr)),
            "min_ms": float(np.min(arr)),
            "p50_ms": float(np.percentile(arr, 50)),
        }

        if len(trimmed) > 0:
            trimmed_lat_stats = {
                "mean_ms": float(np.mean(trimmed)),
                "max_ms": float(np.max(trimmed)),
                "min_ms": float(np.min(trimmed)),
                "std_ms": float(np.std(trimmed)),
                "p50_ms": float(np.percentile(trimmed, 50)),
                "p75_ms": float(np.percentile(trimmed, 75)),
                "p95_ms": float(np.percentile(trimmed, 95)),
                "count": int(len(trimmed)),
                "outliers_removed": int(len(arr) - len(trimmed)),
            }

    return {
        "latencies_found": len(latencies),
        "latency_stats": lat_stats,
        "trimmed_latency_stats": trimmed_lat_stats,
        "rsu_data_distributions": rsu_msg_counts,
        "total_records_saved_to_db": total_influx_written,
        "operating_state_timeline": status_updates,
        "raw_latencies": latencies,
    }
