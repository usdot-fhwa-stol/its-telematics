from typing import Any, Dict, List, cast

import numpy as np
from models import (
    InfluxBatchWrite,
    LogMessage,
    MgmtBSMTraceMetrics,
    RSUStatusPayload,
)


def analyze_system_performance(messages: List[LogMessage]) -> Dict[str, Any]:
    latencies = []
    rsu_msg_counts = {}
    total_influx_written = 0
    status_updates = []

    for msg in messages:
        if msg.message_type == "bsm_published":
            print(msg.payload)
            break
        if not msg.payload:
            continue

        if msg.message_type == "influx_line_built":
            payload = cast(MgmtBSMTraceMetrics, msg.payload)

            p_ts = payload.source_timestamp
            i_ts = payload.influx_timestamp

            delta_ms = i_ts - p_ts if p_ts > 9_999_999_999 else i_ts - (p_ts * 1000)

            latencies.append(delta_ms)

            rsu_ip = payload.tags.rsu_ip
            if rsu_ip:
                rsu_msg_counts[rsu_ip] = rsu_msg_counts.get(rsu_ip, 0) + 1

        elif msg.message_type == "bsm_published":
            if msg.metadata and msg.metadata.rsu and msg.metadata.rsu.ip:
                rsu_ip = msg.metadata.rsu.ip
                rsu_msg_counts[rsu_ip] = rsu_msg_counts.get(rsu_ip, 0) + 1

        elif msg.message_type == "influx_batch_written":
            payload = cast(InfluxBatchWrite, msg.payload)
            total_influx_written += payload.records_written

        elif msg.message_type == "rsu_status_update":
            payload = cast(RSUStatusPayload, msg.payload)

            rsu_ip = payload.rsu.ip if payload.rsu else "unknown"

            status_updates.append(
                {
                    "time": msg.timestamp.isoformat(),
                    "ip": rsu_ip,
                    "status": payload.status,
                    "event": payload.event,
                }
            )

            if rsu_ip != "unknown":
                rsu_msg_counts[rsu_ip] = rsu_msg_counts.get(rsu_ip, 0) + 1

    lat_stats = {}

    if latencies:
        lat_arr = np.array(latencies)

        lat_stats = {
            "mean_ms": float(np.mean(lat_arr)),
            "max_ms": float(np.max(lat_arr)),
            "min_ms": float(np.min(lat_arr)),
            "p50_ms": float(np.percentile(lat_arr, 50)),
            "p95_ms": float(np.percentile(lat_arr, 95)),
        }

    return {
        "latencies_found": len(latencies),
        "latency_stats": lat_stats,
        "rsu_data_distributions": rsu_msg_counts,
        "total_records_saved_to_db": total_influx_written,
        "operating_state_timeline": status_updates,
    }
