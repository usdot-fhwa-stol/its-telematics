from pathlib import Path
from typing import Any, Dict, List

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from models import LogMessage

sns.set_theme(style="darkgrid")
PALETTE = {
    "blue": "tab:blue",
    "green": "tab:green",
    "red": "tab:red",
    "orange": "tab:orange",
    "purple": "tab:purple",
    "violet": "darkviolet",
}


def _plot_latency_histogram(
    raw_latencies: list,
    trimmed_stats: dict,
    test_case: str,
    run_id: str,
    output_dir: Path,
):
    arr = np.array(raw_latencies, dtype=float)
    q1, q3 = np.percentile(arr, 25), np.percentile(arr, 75)
    iqr = q3 - q1
    trimmed = arr[(arr >= q1 - 1.5 * iqr) & (arr <= q3 + 1.5 * iqr)]

    fig, ax = plt.subplots(figsize=(10, 6))
    x_indices = np.arange(len(trimmed))

    sns.scatterplot(x=x_indices, y=trimmed, color=PALETTE["blue"], alpha=0.6, ax=ax)

    mean_ms = trimmed_stats.get("mean_ms")
    if mean_ms is not None:
        ax.axhline(
            mean_ms,
            color=PALETTE["orange"],
            linestyle="--",
            linewidth=1.6,
            label=f"Mean ({mean_ms:.1f} ms)",
        )

    ax.set_xlabel("Sample Index", fontsize=13)
    ax.set_ylabel("End-to-End Latency (ms)", fontsize=13)
    ax.set_title(
        f"Test {test_case} Run {run_id} — Latency Distribution\n"
        f"(IQR-trimmed, n={len(trimmed)}, outliers removed: {trimmed_stats.get('outliers_removed', 0)})",
        fontsize=14,
    )
    ax.legend()
    fig.tight_layout()
    fig.savefig(output_dir / "latency_histogram.png")
    plt.close(fig)


def _plot_latency_over_time(
    latency_timestamps: list,
    raw_latencies: list,
    latency_stats: dict,
    test_case: str,
    run_id: str,
    output_dir: Path,
):
    if not latency_timestamps or not raw_latencies:
        return

    times_pd = pd.to_datetime(latency_timestamps, errors="coerce")
    if times_pd.tz is None:
        times_pd = (
            times_pd.tz_localize("US/Eastern").tz_convert("UTC").tz_localize(None)
        )
    else:
        times_pd = times_pd.tz_convert("UTC").tz_localize(None)

    paired = sorted(zip(times_pd, raw_latencies), key=lambda x: x[0])
    times, latencies = zip(*paired)

    fig, ax = plt.subplots(figsize=(12, 6))

    ax.plot(
        times,
        latencies,
        color=PALETTE["purple"],
        alpha=0.6,
        linewidth=1.5,
        markersize=4,
        label="Latency",
    )

    mean_ms = latency_stats.get("mean_ms")
    if mean_ms is not None:
        ax.axhline(
            mean_ms,
            color=PALETTE["orange"],
            linestyle="--",
            linewidth=1.4,
            label=f"Mean ({mean_ms:.1f} ms)",
        )

    ax.set_xlabel("Wall-Clock Time (UTC)", fontsize=13)
    ax.set_ylabel("Latency (ms)", fontsize=13)
    ax.set_title(f"Test {test_case} Run {run_id} — Latency Over Time", fontsize=14)
    ax.legend()
    plt.xticks(rotation=45)
    fig.tight_layout()
    fig.savefig(output_dir / "latency_over_time.png")
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

    # Force convert to UTC and drop the timezone signature to prevent matplotlib local-time overrides
    df["time"] = pd.to_datetime(df["time"], errors="coerce")
    if df["time"].dt.tz is None:
        df["time"] = (
            df["time"]
            .dt.tz_localize("US/Eastern")
            .dt.tz_convert("UTC")
            .dt.tz_localize(None)
        )
    else:
        df["time"] = df["time"].dt.tz_convert("UTC").dt.tz_localize(None)

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
        color=PALETTE["blue"],
        alpha=0.3,
        ax=ax,
    )
    sns.lineplot(
        data=df,
        x="second",
        y="rolling",
        label="10s Rolling Mean Throughput",
        color=PALETTE["blue"],
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
    trimmed_stats = results.get("trimmed_latency_stats", {})

    mgmt_count = sum(1 for m in messages if m.message_type == "influx_line_built")
    tru_count = sum(1 for m in messages if m.message_type.endswith("_published"))

    summary_rows = [
        {
            "test_case": test_case,
            "run_id": run_id,
            "messages_logged_mgmt": mgmt_count,
            "messages_logged_tru": tru_count,
            "total_tru_published": overall.get("tru_published", 0),
            "total_dropped": overall.get("dropped", 0),
            "overall_drop_rate_pct": overall.get("drop_pct", 0.0),
            "mean_latency_ms": latency_stats.get("mean_ms", float("nan")),
            "p75_latency_ms": latency_stats.get("p75_ms", float("nan")),
            "p95_latency_ms": latency_stats.get("p95_ms", float("nan")),
            "std_latency_ms": latency_stats.get("std_ms", float("nan")),
            "max_latency_ms": latency_stats.get("max_ms", float("nan")),
            "trimmed_mean_latency_ms": trimmed_stats.get("mean_ms", float("nan")),
            "trimmed_p95_latency_ms": trimmed_stats.get("p95_ms", float("nan")),
            "latency_outliers_removed": trimmed_stats.get("outliers_removed", 0),
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
    trimmed_stats = results.get("trimmed_latency_stats", {})

    if export_plots and raw_latencies:
        _plot_latency_histogram(
            raw_latencies, trimmed_stats, test_case, run_id, output_dir
        )
        _plot_latency_over_time(
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
