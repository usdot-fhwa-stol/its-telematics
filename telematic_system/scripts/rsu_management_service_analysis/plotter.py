from pathlib import Path
from typing import Any, Dict, List

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from models import LogMessage

sns.set_theme(style="darkgrid")


def _plot_latency_binned(
    latency_timestamps: list,
    raw_latencies: list,
    latency_stats: Dict[str, Any],
    test_case: str,
    run_id: str,
    output_dir: Path,
):
    if not latency_timestamps or not raw_latencies:
        return

    df = pd.DataFrame(
        {
            "timestamp": pd.to_datetime(latency_timestamps, errors="coerce"),
            "latency": [float(x) for x in raw_latencies],
        }
    )

    df = df.set_index("timestamp")

    binned_df = df.resample("10s").mean().dropna()

    fig, ax = plt.subplots(figsize=(12, 6))

    ax.bar(
        binned_df.index,
        binned_df["latency"],
        width=0.0001,
        color="blue",
        alpha=0.7,
        label="Mean Latency (10s bins)",
    )

    ax.axhline(
        latency_stats.get("mean_ms", 0),
        color="red",
        linestyle="--",
        linewidth=2,
        label="Latency Mean",
    )

    ax.set_xlabel("Wall-Clock Time (UTC)", fontsize=13)
    ax.set_ylabel("Latency (ms)", fontsize=13)
    ax.set_title(f"Test {test_case} Run {run_id} — Latency Binned (10s)", fontsize=14)
    ax.legend()

    # Format X-axis for better readability
    fig.autofmt_xdate()

    fig.tight_layout()
    fig.savefig(output_dir / "latency_binned.png")
    plt.close(fig)


def _get_throughput_df(messages: List[LogMessage]) -> pd.DataFrame:
    rows = []
    for msg in messages:
        bytes_size = getattr(msg, "bytes_size", 0) or 0
        if (
            msg.source_format == "rsu_management_service"
            and msg.message_type == "influx_line_built"
            and msg.timestamp
        ):
            rows.append(
                {"time": msg.timestamp, "source": "Management", "bytes": bytes_size}
            )
        elif (
            msg.source_format == "tru_instance"
            and msg.message_type.endswith("_published")
            and msg.timestamp
        ):
            rows.append({"time": msg.timestamp, "source": "TRU", "bytes": bytes_size})

    if not rows:
        return pd.DataFrame()

    df = pd.DataFrame(rows)

    df["second"] = df["time"].dt.floor("s")

    grouped = (
        df.groupby(["second", "source"])["bytes"].sum().reset_index(name="bytes_count")
    )
    pivot = (
        grouped.pivot(index="second", columns="source", values="bytes_count")
        .fillna(0)
        .reset_index()
    )
    for col in ("Management", "TRU"):
        if col not in pivot.columns:
            pivot[col] = 0.0

    pivot["Management"] = pivot["Management"] / 1024.0
    pivot["TRU"] = pivot["TRU"] / 1024.0

    return pivot


def _plot_throughput_mgmt(
    df: pd.DataFrame, test_case: str, run_id: str, output_dir: Path
):
    if df.empty:
        return

    df["rolling"] = df["Management"].rolling(window=10, min_periods=1).mean()

    fig, ax = plt.subplots(figsize=(12, 6))
    sns.lineplot(
        data=df,
        x="second",
        y="Management",
        label="Throughput",
        color="blue",
        alpha=0.3,
        ax=ax,
    )
    sns.lineplot(
        data=df,
        x="second",
        y="rolling",
        label="10s Rolling Mean Throughput",
        color="blue",
        linewidth=2,
        ax=ax,
    )

    ax.set_xlabel("Time (UTC)")
    ax.set_ylabel("Throughput (KB/s)")
    ax.set_title(f"Test {test_case} Run {run_id} — RSU Management Service Throughput")
    ax.legend()
    plt.xticks(rotation=45)
    fig.tight_layout()
    fig.savefig(output_dir / "throughput_mgmt.png")
    plt.close(fig)


def _export_summary_csv(
    test_case: str,
    run_id: str,
    messages: List[LogMessage],
    results: Dict[str, Any],
    output_dir: Path,
):
    drops = results.get("drops", {})
    overall = drops.get("overall", {})

    throughput_stats = results.get("throughput_stats", {})
    latency_stats = results.get("latency_stats", {})

    summary_rows = [
        {
            "test_case": test_case,
            "run_id": run_id,
            "messages_logged_mgmt": overall.get("rsu_published", 0),
            "messages_logged_tru": overall.get("tru_published", 0),
            "total_dropped": overall.get("dropped", 0),
            "overall_drop_rate_pct": overall.get("drop_pct", 0.0),
            "mean_latency_ms": latency_stats.get("mean_ms", float("nan")),
            "p75_latency_ms": latency_stats.get("p75_ms", float("nan")),
            "p95_latency_ms": latency_stats.get("p95_ms", float("nan")),
            "std_latency_ms": latency_stats.get("std_ms", float("nan")),
            "max_latency_ms": latency_stats.get("max_ms", float("nan")),
            "unique_rsus_seen": len(results.get("rsu_ip_counts", {})),
            "total_raw_bytes": results.get("total_raw_bytes", 0),
            "mean_tru_throughput_bps": throughput_stats.get("tru_bytes_per_sec", 0.0),
            "mean_mgmt_throughput_bps": throughput_stats.get("rsu_bytes_per_sec", 0.0),
            "topic": "OVERALL",
        }
    ]

    pd.DataFrame(summary_rows).to_csv(output_dir / "data_summary.csv", index=False)


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

    raw_latencies = results.get("raw_latencies", [])
    latency_stats = results.get("latency_stats", {})

    if export_plots and raw_latencies:
        _plot_latency_binned(
            results.get("latency_timestamps", []),
            raw_latencies,
            latency_stats,
            test_case,
            run_id,
            output_dir,
        )

        throughput_df = _get_throughput_df(messages)
        if not throughput_df.empty:
            _plot_throughput_mgmt(throughput_df, test_case, run_id, output_dir)

    if export_csv:
        _export_summary_csv(test_case, run_id, messages, results, output_dir)

    print(f"[✓] Reports exported to: {output_dir}")
