from pathlib import Path
from typing import Any, Dict, List, cast

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from models import LogMessage, MgmtBSMTraceMetrics

sns.set_theme(style="whitegrid")


def clean_latency_outliers_iqr(delays: List[float]) -> List[float]:
    if not delays:
        return []

    arr = np.array(delays)

    q1 = np.percentile(arr, 25)
    q3 = np.percentile(arr, 75)

    iqr = q3 - q1

    lower = q1 - (1.5 * iqr)
    upper = q3 + (1.5 * iqr)

    return arr[(arr >= lower) & (arr <= upper)].tolist()


def generate_plots_and_sheets(
    test_case: str,
    run_id: str,
    messages: List[LogMessage],
    results: Dict[str, Any],
    export_plots: bool = True,
    export_csv: bool = True,
):
    output_dir = (
        Path("telematic_system/scripts/log_analysis/output")
        / f"{test_case}_run_{run_id}"
    )
    output_dir.mkdir(parents=True, exist_ok=True)

    mgmt_msgs = [m for m in messages if m.source_format.lower() == "java"]

    tru_msgs = [m for m in messages if m.source_format.lower() == "cpp"]

    if export_plots:
        latencies_seconds = []

        for msg in mgmt_msgs:
            if msg.message_type != "influx_line_built":
                continue

            if not msg.payload:
                continue

            payload = cast(MgmtBSMTraceMetrics, msg.payload)

            p_ts = payload.source_timestamp
            i_ts = payload.influx_timestamp

            delta_ms = i_ts - p_ts if p_ts > 9_999_999_999 else i_ts - (p_ts * 1000)

            latencies_seconds.append(delta_ms / 1000.0)

        cleaned_seconds = clean_latency_outliers_iqr(latencies_seconds)

        if cleaned_seconds:
            plt.figure(figsize=(10, 6))

            sns.histplot(
                cleaned_seconds,
                kde=True,
                bins=30,
                color="teal",
            )

            plt.xlim(
                0,
                max(cleaned_seconds) * 1.1,
            )

            plt.xlabel(
                "End-to-End Latency (Seconds)",
                fontsize=13,
            )

            plt.ylabel(
                "Number of Samples",
                fontsize=13,
            )

            plt.title(
                f"Test {test_case} Run {run_id} Latency Histogram",
                fontsize=15,
            )

            plt.tight_layout()

            plt.savefig(output_dir / "latency_density.png")

            plt.close()

    import json
    from collections import defaultdict

    comparison_rows = []

    mgmt_by_timestamp = defaultdict(list)

    for msg in mgmt_msgs:
        if msg.message_type == "influx_line_built" and msg.payload:
            mgmt_by_timestamp[msg.payload.source_timestamp].append(msg.payload)

    for msg in tru_msgs:
        if msg.message_type != "bsm_published" or not msg.payload:
            continue

        tru_ts = msg.payload.timestamp

        matches = mgmt_by_timestamp.get(tru_ts, [])

        if not matches:
            continue

        mgmt_payload = matches[0]

        tru_calculated_bytes = msg.payload.bytes_size

        mgmt_calculated_bytes = len(
            json.dumps(
                mgmt_payload.__dict__,
                default=str,
                separators=(",", ":"),
            ).encode("utf-8")
        )

        comparison_rows.append(
            {
                "source_timestamp": tru_ts,
                "vehicle_id": msg.payload.message.coreData.id,
                "msgCnt": msg.payload.message.coreData.msgCnt,
                "secMark": msg.payload.message.coreData.secMark,
                # OFFICIAL MANAGEMENT VALUE
                "mgmt_reported_bytes": mgmt_payload.bytes_size,
                # CALCULATED FROM TRU PAYLOAD
                "tru_calculated_bytes": tru_calculated_bytes,
                # CALCULATED FROM MGMT PAYLOAD
                "mgmt_calculated_bytes": mgmt_calculated_bytes,
                "reported_minus_tru": (mgmt_payload.bytes_size - tru_calculated_bytes),
                "reported_minus_mgmt_calc": (
                    mgmt_payload.bytes_size - mgmt_calculated_bytes
                ),
                "tru_minus_mgmt_calc": (tru_calculated_bytes - mgmt_calculated_bytes),
            }
        )

    comparison_df = pd.DataFrame(comparison_rows)

    comparison_df.to_csv(
        output_dir / "byte_size_comparison.csv",
        index=False,
    )

    print(
        comparison_df[
            [
                "vehicle_id",
                "msgCnt",
                "mgmt_reported_bytes",
                "tru_calculated_bytes",
                "mgmt_calculated_bytes",
                "reported_minus_tru",
                "reported_minus_mgmt_calc",
            ]
        ].head(20)
    )

    if export_plots:
        time_series = []

        for msg in messages:
            event_ts = None
            bytes_size = None
            source = None

            if (
                msg.source_format.lower() == "java"
                and msg.message_type == "influx_line_built"
                and msg.payload
            ):
                payload = cast(MgmtBSMTraceMetrics, msg.payload)

                event_ts = pd.to_datetime(
                    payload.source_timestamp,
                    unit="ms",
                    utc=True,
                )

                bytes_size = payload.bytes_size
                source = "Management"

            elif (
                msg.source_format.lower() == "cpp"
                and msg.message_type == "bsm_published"
                and msg.payload
                and hasattr(msg.payload, "bytes_size")
            ):
                event_ts = pd.to_datetime(
                    msg.payload.timestamp,
                    unit="ms",
                    utc=True,
                )

                bytes_size = msg.payload.bytes_size
                source = "TRU"

            if event_ts is None or bytes_size is None or source is None:
                continue

            time_series.append(
                {
                    "time": event_ts,
                    "bytes": bytes_size,
                    "source": source,
                }
            )

        if time_series:
            df = pd.DataFrame(time_series)

            df["second"] = df["time"].dt.floor("s")

            grouped = df.groupby(
                ["second", "source"],
                as_index=False,
            )["bytes"].sum()

            pivot = (
                grouped.pivot(
                    index="second",
                    columns="source",
                    values="bytes",
                )
                .fillna(0)
                .reset_index()
            )

            if "Management" not in pivot.columns:
                pivot["Management"] = 0

            if "TRU" not in pivot.columns:
                pivot["TRU"] = 0

            pivot["throughput_loss_bytes"] = pivot["Management"] - pivot["TRU"]

            plt.figure(figsize=(12, 6))

            sns.lineplot(
                data=pivot,
                x="second",
                y="Management",
                label="Management Bytes/Sec",
            )

            sns.lineplot(
                data=pivot,
                x="second",
                y="TRU",
                label="TRU Bytes/Sec",
            )

            plt.xlabel("Event Time")
            plt.ylabel("Bytes Per Second")
            plt.title(f"{test_case} (Run {run_id}) Throughput")

            plt.xticks(rotation=45)
            plt.tight_layout()

            plt.savefig(output_dir / "throughput_comparison.png")

            plt.close()

            plt.figure(figsize=(12, 6))

            sns.lineplot(
                data=pivot,
                x="second",
                y="throughput_loss_bytes",
            )

            plt.axhline(
                y=0,
                color="black",
                linestyle="--",
            )

            plt.xlabel("Event Time")
            plt.ylabel("Management - TRU Bytes/Sec")

            plt.title(f"{test_case} (Run {run_id}) Throughput Loss")

            plt.xticks(rotation=45)
            plt.tight_layout()

            plt.savefig(output_dir / "throughput_loss.png")

            plt.close()

    if export_csv:
        lat_stats = results.get(
            "latency_stats",
            {},
        )

        rsu_counts = results.get(
            "rsu_data_distributions",
            {},
        )

        count_mgmt = len(mgmt_msgs)
        count_tru = len(tru_msgs)

        loss_count = count_mgmt - count_tru

        loss_rate_pct = (
            (abs(loss_count) / max(count_tru, 1)) * 100.0 if count_tru > 0 else 0.0
        )

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
            "mean_latency_ms": [
                lat_stats.get(
                    "mean_ms",
                    np.nan,
                )
            ],
            "p95_latency_ms": [
                lat_stats.get(
                    "p95_ms",
                    np.nan,
                )
            ],
            "metric_2_latency_status": [
                "PASS"
                if lat_stats.get(
                    "p95_ms",
                    999999,
                )
                < 1000
                else "FAIL"
            ],
            "db_records_written": [
                results.get(
                    "total_records_saved_to_db",
                    0,
                )
            ],
            "unique_rsus_seen": [len(rsu_counts)],
        }

        pd.DataFrame(summary).to_csv(
            output_dir / "execution_summary.csv",
            index=False,
        )

    print(f"[✓] Reports exported to: {output_dir}")
