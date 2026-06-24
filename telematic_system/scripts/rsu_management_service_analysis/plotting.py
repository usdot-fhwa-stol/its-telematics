from pathlib import Path
from typing import Any, Dict, List, cast

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from models import InfluxBSMTraceRecord, LogMessage

sns.set_theme(style="darkgrid")


def generate_plots_and_sheets(
    test_case: str,
    run_id: str,
    messages: List[LogMessage],
    results: Dict[str, Any],
    export_plots: bool = True,
    export_csv: bool = True,
):
    output_dir = (
        Path("telematic_system/scripts/rsu_management_service_analysis/output")
        / f"{test_case}_run_{run_id}"
    )
    output_dir.mkdir(parents=True, exist_ok=True)

    mgmt_msgs = [m for m in messages if m.message_type == "influx_line_built"]
    tru_msgs = [m for m in messages if m.message_type == "bsm_published"]

    # ------------------------------------------------------------------
    # Latency histogram
    # ------------------------------------------------------------------
    if export_plots:
        trimmed_stats = results.get("trimmed_latency_stats", {})
        raw_latencies = results.get("raw_latencies", [])

        if raw_latencies and trimmed_stats:
            arr = np.array(raw_latencies, dtype=float)
            q1, q3 = np.percentile(arr, 25), np.percentile(arr, 75)
            iqr = q3 - q1
            trimmed_ms = arr[(arr >= q1 - 1.5 * iqr) & (arr <= q3 + 1.5 * iqr)]
            trimmed_s = trimmed_ms / 1000.0

            plt.figure(figsize=(10, 6))
            sns.histplot(trimmed_s, bins=30)
            plt.xlim(0, max(trimmed_s) * 1.1)
            plt.xlabel("End-to-End Latency (Seconds)", fontsize=13)
            plt.ylabel("Number of Samples", fontsize=13)
            plt.title(
                f"Test {test_case} Run {run_id} Latency Histogram "
                f"(IQR trimmed, n={trimmed_stats['count']})",
                fontsize=15,
            )
            plt.tight_layout()
            plt.savefig(output_dir / "latency_hist.png")
            plt.close()

    # ------------------------------------------------------------------
    # Throughput
    # ------------------------------------------------------------------
    if export_plots:
        time_series = []
        for msg in messages:
            if not msg.payload:
                continue

            if msg.source_format.lower() == "java":
                if msg.message_type == "influx_line_built":
                    payload = cast(InfluxBSMTraceRecord, msg.payload)
                    time_series.append(
                        {
                            "time": pd.to_datetime(
                                payload.source_timestamp, unit="ms", utc=True
                            ),
                            "bytes": payload.bytes_size,
                            "source": "Management",
                        }
                    )

            elif msg.source_format.lower() == "cpp":
                if msg.message_type == "bsm_published" and hasattr(
                    msg.payload, "bytes_size"
                ):
                    time_series.append(
                        {
                            "time": pd.to_datetime(
                                msg.payload.timestamp, unit="ms", utc=True
                            ),
                            "bytes": msg.payload.bytes_size,
                            "source": "TRU",
                        }
                    )

        if time_series:
            df = pd.DataFrame(time_series)
            df["second"] = df["time"].dt.floor("s")
            grouped = df.groupby(["second", "source"], as_index=False)["bytes"].sum()
            pivot = (
                grouped.pivot(index="second", columns="source", values="bytes")
                .fillna(0)
                .reset_index()
            )
            for col in ("Management", "TRU"):
                if col not in pivot.columns:
                    pivot[col] = 0
            pivot["throughput_loss_bytes"] = pivot["Management"] - pivot["TRU"]

            plt.figure(figsize=(12, 6))
            sns.lineplot(
                data=pivot,
                x="second",
                y="Management",
                label="Management Bytes/Sec",
                color="tab:blue",
            )
            sns.lineplot(
                data=pivot,
                x="second",
                y="TRU",
                label="TRU Bytes/Sec",
                color="tab:green",
            )
            sns.lineplot(
                data=pivot,
                x="second",
                y="throughput_loss_bytes",
                label="Throughput Loss (Mgmt - TRU)",
                color="tab:red",
            )
            plt.axhline(y=0, color="black", linestyle="--", linewidth=0.8)
            plt.xlabel("Event Time")
            plt.ylabel("Bytes Per Second")
            plt.title(f"Test {test_case} (Run {run_id}) Throughput Loss")
            plt.legend()
            plt.xticks(rotation=45)
            plt.tight_layout()
            plt.savefig(output_dir / "throughput_comparison.png")
            plt.close()

    # ------------------------------------------------------------------
    # Data Summary CSV
    # ------------------------------------------------------------------
    if export_csv:
        trimmed_stats = results.get("latency_stats", {})
        rsu_counts = results.get("rsu_data_distributions", {})

        count_mgmt = len(mgmt_msgs)
        count_tru = len(tru_msgs)
        loss_count = count_mgmt - count_tru
        loss_rate_pct = (abs(loss_count) / count_tru) * 100.0 if count_tru > 0 else 0.0

        summary = {
            "test_case": [test_case],
            "run_id": [run_id],
            "messages_logged_mgmt": [count_mgmt],
            "messages_logged_tru": [count_tru],
            "message_delta": [loss_count],
            "calculated_loss_rate_pct": [round(loss_rate_pct, 3)],
            "metric_1_completeness_status": [
                "PASS" if loss_rate_pct <= 1.0 else "FAIL"
            ],
            "mean_latency_ms": [trimmed_stats.get("mean_ms", np.nan)],
            "max_latency_ms": [trimmed_stats.get("max_ms", np.nan)],
            "std_latency_ms": [trimmed_stats.get("std_ms", np.nan)],
            "p75_latency_ms": [trimmed_stats.get("p75_ms", np.nan)],
            "p95_latency_ms": [trimmed_stats.get("p95_ms", np.nan)],
            "latency_outliers_removed": [trimmed_stats.get("outliers_removed", 0)],
            "metric_2_latency_status": [
                "PASS" if trimmed_stats.get("mean_ms", 999999) < 1000 else "FAIL"
            ],
            "db_records_written": [results.get("total_records_saved_to_db", 0)],
            "unique_rsus_seen": [len(rsu_counts)],
        }
        pd.DataFrame(summary).to_csv(output_dir / "data_summary.csv", index=False)

    print(f"[✓] Reports exported to: {output_dir}")
