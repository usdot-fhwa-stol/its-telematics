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

    if len(trimmed) > 1:
        data_range = np.max(trimmed) - np.min(trimmed)
        bins = (
            "auto"
            if data_range > 0
            else np.linspace(np.min(trimmed) - 0.5, np.max(trimmed) + 0.5, 11)
        )
    else:
        bins = 10

    fig, ax = plt.subplots(figsize=(10, 6))
    sns.histplot(trimmed, bins=bins, kde=True, color=PALETTE["blue"], ax=ax)

    mean_ms = trimmed_stats.get("mean_ms")
    if mean_ms is not None:
        ax.axvline(
            mean_ms,
            color=PALETTE["orange"],
            linestyle="--",
            linewidth=1.6,
            label=f"Mean ({mean_ms:.1f} ms)",
        )

    ax.axvline(
        1_000,
        color=PALETTE["red"],
        linestyle="--",
        linewidth=1.6,
        label="1s Threshold",
    )

    max_val = np.max(trimmed) if len(trimmed) > 0 else 10
    ax.set_xlim(0, max(max_val * 1.1, 2.0))
    ax.set_xlabel("End-to-End Latency (ms)", fontsize=13)
    ax.set_ylabel("Sample Count", fontsize=13)
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

    paired = sorted(zip(latency_timestamps, raw_latencies), key=lambda x: x[0])
    times, latencies = zip(*paired)

    fig, ax = plt.subplots(figsize=(12, 6))
    ax.scatter(
        times,
        latencies,
        color=PALETTE["purple"],
        alpha=0.5,
        s=10,
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

    ax.axhline(
        1_000,
        color=PALETTE["red"],
        linestyle="--",
        linewidth=1.4,
        label="1s Threshold",
    )

    ax.set_xlabel("Wall-Clock Time", fontsize=13)
    ax.set_ylabel("Latency (ms)", fontsize=13)
    ax.set_title(
        f"Test {test_case} Run {run_id} — Latency Over Time", fontsize=14
    )
    ax.legend()
    plt.xticks(rotation=45)
    fig.tight_layout()
    fig.savefig(output_dir / "latency_over_time.png")
    plt.close(fig)

def _plot_throughput(
    messages: List[LogMessage],
    test_case: str,
    run_id: str,
    output_dir: Path,
):
    rows = []
    for msg in messages:
        if (
            msg.source_format == "rsu_management_service"
            and msg.message_type == "influx_line_built"
            and msg.timestamp
        ):
            rows.append({"time": msg.timestamp, "source": "Management"})
        elif (
            msg.source_format == "tru_instance"
            and msg.message_type.endswith("_published")
            and msg.timestamp
        ):
            rows.append({"time": msg.timestamp, "source": "TRU"})

    if not rows:
        return

    df = pd.DataFrame(rows)
    df["time"] = pd.to_datetime(df["time"], utc=True)
    df["second"] = df["time"].dt.floor("s")
    grouped = (
        df.groupby(["second", "source"]).size().reset_index(name="msg_count")
    )
    pivot = (
        grouped.pivot(index="second", columns="source", values="msg_count")
        .fillna(0)
        .reset_index()
    )
    for col in ("Management", "TRU"):
        if col not in pivot.columns:
            pivot[col] = 0.0
    pivot["delta"] = pivot["Management"] - pivot["TRU"]
    avg_delta = pivot["delta"].mean()

    fig, ax = plt.subplots(figsize=(12, 6))
    sns.lineplot(data=pivot, x="second", y="Management",
                 label="Management msg/s", color=PALETTE["blue"], ax=ax)
    sns.lineplot(data=pivot, x="second", y="TRU",
                 label="TRU msg/s", color=PALETTE["green"], ax=ax)
    sns.lineplot(data=pivot, x="second", y="delta",
                 label="Loss (Mgmt − TRU)", color=PALETTE["red"], ax=ax)
    ax.axhline(avg_delta, color=PALETTE["orange"], linestyle="-.",
               linewidth=1.8, label=f"Avg Delta ({avg_delta:.2f} msg/s)")
    ax.axhline(0, color="black", linestyle="--", linewidth=0.8)
    ax.set_xlabel("Time")
    ax.set_ylabel("Messages per Second")
    ax.set_title(
        f"Test {test_case} Run {run_id} — Throughput Comparison & Loss"
    )
    ax.legend()
    plt.xticks(rotation=45)
    fig.tight_layout()
    fig.savefig(output_dir / "throughput_comparison.png")
    plt.close(fig)


def _export_summary_csv(
    test_case: str,
    run_id: str,
    messages: List[LogMessage],
    results: Dict[str, Any],
    output_dir: Path,
):
    completeness = results.get("completeness", {})
    overall = completeness.get("overall", {})
    per_topic = completeness.get("per_topic", {})

    mgmt_count = sum(1 for m in messages if m.message_type == "influx_line_built")
    tru_count = sum(1 for m in messages if m.message_type.endswith("_published"))

    latency_stats = results.get("latency_stats", {})
    trimmed_stats = results.get("trimmed_latency_stats", {})

    summary_rows = [
        {
            "test_case": test_case,
            "run_id": run_id,
            "messages_logged_mgmt": mgmt_count,
            "messages_logged_tru": tru_count,
            "total_tru_published": overall.get("tru_published", 0),
            "total_rsu_received": overall.get("rsu_received", 0),
            "total_dropped": overall.get("dropped", 0),
            "overall_drop_rate_pct": overall.get("drop_rate_pct", 0.0),
            "overall_completeness_pct": overall.get("completeness_pct", 0.0),
            "completeness_status": "PASS"
            if overall.get("drop_rate_pct", 100) <= 1.0
            else "FAIL",
            "mean_latency_ms": latency_stats.get("mean_ms", float("nan")),
            "p75_latency_ms": latency_stats.get("p75_ms", float("nan")),
            "p95_latency_ms": latency_stats.get("p95_ms", float("nan")),
            "std_latency_ms": latency_stats.get("std_ms", float("nan")),
            "max_latency_ms": latency_stats.get("max_ms", float("nan")),
            "trimmed_mean_latency_ms": trimmed_stats.get("mean_ms", float("nan")),
            "trimmed_p95_latency_ms": trimmed_stats.get("p95_ms", float("nan")),
            "latency_outliers_removed": trimmed_stats.get("outliers_removed", 0),
            "latency_status": "PASS"
            if (
                not np.isnan(latency_stats.get("mean_ms", float("nan")))
                and latency_stats.get("mean_ms", float("inf")) < 1000
            )
            else "FAIL",
            "unique_rsus_seen": len(results.get("rsu_ip_counts", {})),
            "topic": "OVERALL",
        }
    ]

    for topic, stats in sorted(per_topic.items()):
        summary_rows.append(
            {
                "test_case": test_case,
                "run_id": run_id,
                "messages_logged_mgmt": "",
                "messages_logged_tru": "",
                "total_tru_published": stats["tru_published"],
                "total_rsu_received": stats["rsu_received"],
                "total_dropped": stats["dropped"],
                "overall_drop_rate_pct": stats["drop_rate_pct"],
                "overall_completeness_pct": stats["completeness_pct"],
                "completeness_status": "PASS"
                if stats["drop_rate_pct"] <= 1.0
                else "FAIL",
                "mean_latency_ms": "",
                "p75_latency_ms": "",
                "p95_latency_ms": "",
                "std_latency_ms": "",
                "max_latency_ms": "",
                "trimmed_mean_latency_ms": "",
                "trimmed_p95_latency_ms": "",
                "latency_outliers_removed": "",
                "latency_status": "",
                "unique_rsus_seen": "",
                "topic": topic,
            }
        )

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
        _plot_throughput(messages, test_case, run_id, output_dir)

    if export_csv:
        _export_summary_csv(test_case, run_id, messages, results, output_dir)

    print(f"[✓] Reports exported to: {output_dir}")
