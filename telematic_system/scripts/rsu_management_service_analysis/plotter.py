from pathlib import Path
from typing import Any, Dict, List

import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns

from models import LogMessage

sns.set_theme(style="darkgrid")


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _plot_latency_over_time(
    latency_timestamps: list,
    raw_latencies: list,
    latency_stats: dict,
    test_case: str,
    run_id: str,
    output_dir: Path,
) -> None:
    if not latency_timestamps or not raw_latencies:
        return

    df = pd.DataFrame(
        {
            "timestamp": pd.to_datetime(latency_timestamps, errors="coerce"),
            "latency_ms": [float(x) for x in raw_latencies],
        }
    ).sort_values("timestamp")

    mean_val = latency_stats["mean"]
    p95_val = latency_stats["p95"]
    min_val = latency_stats["min"]
    max_val = latency_stats["max"]

    fig, ax = plt.subplots(figsize=(12, 6))

    ax.plot(
        df["timestamp"],
        df["latency_ms"],
        color="steelblue",
        alpha=0.5,
        linewidth=1,
        label="Latency",
    )
    ax.axhline(
        mean_val,
        color="crimson",
        linestyle="-.",
        linewidth=1.5,
        label=f"Mean ({mean_val:.1f} ms)",
    )
    ax.axhline(
        p95_val,
        color="darkred",
        linestyle=":",
        linewidth=1.5,
        label=f"P95 ({p95_val:.1f} ms)",
    )

    if (max_val - min_val) > 250:
        ax.axhline(
            500,
            color="firebrick",
            linestyle="--",
            linewidth=1.5,
            label="Threshold (500 ms)",
        )

    ax.set_xlabel("Time (UTC)", fontsize=13)
    ax.set_ylabel("Latency (ms)", fontsize=13)
    ax.set_title(
        f"Test {test_case} Run {run_id} — End-to-End Latency", fontsize=14
    )
    ax.legend(loc="upper right")
    plt.xticks(rotation=45)
    fig.tight_layout()
    fig.savefig(output_dir / "latency_over_time.png")
    plt.close(fig)


def _plot_rsu_throughput(
    series: list[tuple],
    test_case: str,
    run_id: str,
    output_dir: Path,
) -> None:
    """
    Parameters
    ----------
    series : list of (datetime, kb_per_second) from the analyzer
    """
    if not series:
        return

    df = pd.DataFrame(series, columns=["second", "kb_per_sec"])
    df["rolling"] = df["kb_per_sec"].rolling(window=10, min_periods=1).mean()

    fig, ax = plt.subplots(figsize=(12, 6))
    sns.lineplot(
        data=df,
        x="second",
        y="kb_per_sec",
        label="Throughput",
        color="steelblue",
        alpha=0.3,
        ax=ax,
    )
    sns.lineplot(
        data=df,
        x="second",
        y="rolling",
        label="10 s Rolling Mean",
        color="steelblue",
        linewidth=2,
        ax=ax,
    )

    ax.set_xlabel("Time (UTC)")
    ax.set_ylabel("Throughput (KB/s)")
    ax.set_title(
        f"Test {test_case} Run {run_id} — RSU Management Service Throughput"
    )
    ax.legend()
    plt.xticks(rotation=45)
    fig.tight_layout()
    fig.savefig(output_dir / "throughput_rsu.png")
    plt.close(fig)


def _export_summary_csv(
    test_case: str,
    run_id: str,
    results: Dict[str, Any],
    output_dir: Path,
) -> None:
    drops = results.get("drops", {})
    overall = drops.get("overall", {})
    latency_stats = results.get("latency", {}).get("stats", {})
    rsu_tp_stats = results.get("throughput", {}).get("rsu", {}).get("stats", {})

    row = {
        "test_case": test_case,
        "run_id": run_id,
        # drop analysis
        "tru_published": overall.get("tru_published", 0),
        "rsu_received": overall.get("rsu_received", 0),
        "total_dropped": overall.get("dropped", 0),
        "drop_rate_pct": overall.get("drop_pct", 0.0),
        # latency
        "mean_latency_ms": latency_stats.get("mean", float("nan")),
        "p75_latency_ms": latency_stats.get("p75", float("nan")),
        "p95_latency_ms": latency_stats.get("p95", float("nan")),
        "std_latency_ms": latency_stats.get("std", float("nan")),
        "max_latency_ms": latency_stats.get("max", float("nan")),
        # rsu throughput
        "mean_rsu_throughput_kbps": rsu_tp_stats.get("mean", float("nan")),
        "min_rsu_throughput_kbps": rsu_tp_stats.get("min", float("nan")),
        "max_rsu_throughput_kbps": rsu_tp_stats.get("max", float("nan")),
        "p75_rsu_throughput_kbps": rsu_tp_stats.get("p75", float("nan")),
        "p95_rsu_throughput_kbps": rsu_tp_stats.get("p95", float("nan")),
        "std_rsu_throughput_kbps": rsu_tp_stats.get("std", float("nan")),
        "rsu_throughput_sample_count": rsu_tp_stats.get("count", 0),
        # misc
        "unique_rsus_seen": len(results.get("rsu_ip_counts", {})),
    }

    pd.DataFrame([row]).to_csv(output_dir / "data_summary.csv", index=False)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def generate_plots_and_sheets(
    test_case: str,
    run_id: str,
    results: Dict[str, Any],
    export_plots: bool = True,
    export_csv: bool = True,
) -> None:
    output_dir = (
        Path("telematic_system/scripts/rsu_management_service_analysis/output")
        / f"{test_case}_run_{run_id}"
    )
    output_dir.mkdir(parents=True, exist_ok=True)

    latency = results.get("latency", {})
    raw_latencies = latency.get("raw", [])
    latency_timestamps = latency.get("timestamps", [])
    latency_stats = latency.get("stats", {})

    rsu_throughput_series = (
        results.get("throughput", {}).get("rsu", {}).get("series", [])
    )

    if export_plots:
        if raw_latencies:
            _plot_latency_over_time(
                latency_timestamps,
                raw_latencies,
                latency_stats,
                test_case,
                run_id,
                output_dir,
            )

        if rsu_throughput_series:
            _plot_rsu_throughput(
                rsu_throughput_series,
                test_case,
                run_id,
                output_dir,
            )

    if export_csv:
        _export_summary_csv(test_case, run_id, results, output_dir)

    print(f"[✓] Reports exported to: {output_dir}")