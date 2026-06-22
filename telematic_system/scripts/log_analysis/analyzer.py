# analyzer.py
from typing import Any, Dict, List

from models import LogMessage, RunMetrics


def analyze_system_performance(messages: List[LogMessage]) -> Dict[str, Any]:
    """Analyzes system delays, data completeness, and overall throughput metrics."""
    latencies = []
    rsu_msg_counts = {}
    total_influx_written = 0
    status_updates = []

    for msg in messages:
        f = msg.fields
        # Latency calculations
        if "payload_timestamp" in msg.fields and "influx_timestamp_ms" in msg.fields:
            try:
                # Convert strings out of regex format mappings back to int structures
                p_ts = int(msg.fields["payload_timestamp"])
                i_ts = int(msg.fields["influx_timestamp_ms"])

                # Check for unit variations (seconds vs milliseconds)
                if p_ts > 9_999_999_999:  # Must be millisecond epochs
                    delta_ms = i_ts - p_ts
                else:  # Convert seconds to milliseconds
                    delta_ms = (i_ts) - (p_ts * 1000)

                latencies.append(delta_ms)
            except (ValueError, TypeError):
                pass

        # Aggregate trace message counts by RSU Ip
        rsu_ip = f.get("rsu_ip")
        if rsu_ip:
            rsu_msg_counts[rsu_ip] = rsu_msg_counts.get(rsu_ip, 0) + 1

        if msg.message_type == "influx_batch_write":
            total_influx_written += f.get("records_count", 0)

        if msg.message_type == "rsu_status_event":
            status_updates.append(
                {
                    "time": msg.timestamp.isoformat(),
                    "ip": f.get("rsu_ip"),
                    "status": f.get("status"),
                    "event": f.get("event"),
                }
            )

    # Summarize latency
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
