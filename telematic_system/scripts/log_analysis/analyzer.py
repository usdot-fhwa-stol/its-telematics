from typing import Any, Dict, List, cast

from models import (
    InfluxBatchWrite,
    LogMessage,
    MgmtBSMTraceMetrics,
    RSUStatusPayload,
)


def analyze_system_performance(messages: List[LogMessage]) -> Dict[str, Any]:
    """Analyzes system delays, data completeness, and overall throughput metrics."""
    latencies = []
    rsu_msg_counts = {}
    total_influx_written = 0
    status_updates = []

    for msg in messages:
        if not msg.payload:
            continue

        # 1. Pipeline Latency Calculations & RSU Ingestion Metrics
        if msg.message_type == "influx_line_built":
            # Explicitly cast the broad Union payload to the expected dataclass structure
            payload = cast(MgmtBSMTraceMetrics, msg.payload)
            p_ts = payload.source_timestamp
            i_ts = payload.influx_timestamp

            # Guard check for unit variations (seconds vs milliseconds)
            if p_ts > 9_999_999_999:  # Already a millisecond epoch
                delta_ms = i_ts - p_ts
            else:  # Convert source seconds to milliseconds
                delta_ms = i_ts - (p_ts * 1000)

            latencies.append(delta_ms)

            rsu_ip = payload.tags.rsu_ip
            if rsu_ip:
                rsu_msg_counts[rsu_ip] = rsu_msg_counts.get(rsu_ip, 0) + 1

        # 2. Inbound Edge Message Distribution Tracking (C++ Apps)
        elif msg.message_type == "bsm_published":
            if msg.metadata and msg.metadata.rsu and msg.metadata.rsu.ip:
                rsu_ip = msg.metadata.rsu.ip
                rsu_msg_counts[rsu_ip] = rsu_msg_counts.get(rsu_ip, 0) + 1

        # 3. Aggregate Throughput Saved to Database via Influx Batch Confirmations
        elif msg.message_type == "influx_batch_written":
            payload = cast(InfluxBatchWrite, msg.payload)
            total_influx_written += payload.records_written

        # 4. Log RSU Operating State Transitions
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
            if rsu_ip and rsu_ip != "unknown":
                rsu_msg_counts[rsu_ip] = rsu_msg_counts.get(rsu_ip, 0) + 1

    # Summarize Latency Distributions for CDF / Distribution Plots
    lat_stats = {}
    if latencies:
        lat_arr = sorted(latencies)
        lat_stats = {
            "mean_ms": sum(lat_arr) / len(lat_arr),
            "max_ms": lat_arr[-1],
            "min_ms": lat_arr[0],
            "p50_ms": lat_arr[len(lat_arr) // 2],
            "p95_ms": lat_arr[int(len(lat_arr) * 0.95)],
        }

    return {
        "latencies_found": len(latencies),
        "latency_stats": lat_stats,
        "rsu_data_distributions": rsu_msg_counts,
        "total_records_saved_to_db": total_influx_written,
        "operating_state_timeline": status_updates,
    }
