from pathlib import Path
from typing import Any, Dict

import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns

from analyzer import Stats

sns.set_theme(style="darkgrid")


def _plot_latency_over_time(
    latency_timestamps: list,
    raw_latencies: list,
    stats: Stats,
    test_case: str,
    run_id: str,
    output_dir: Path,
) -> None:
    df = pd.DataFrame(
        {
            "timestamp": pd.to_datetime(latency_timestamps, errors="coerce"),
            "latency_ms": [float(x) for x in raw_latencies],
        }
    ).sort_values("timestamp")

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
        stats["mean"],
        color="crimson",
        linestyle="-.",
        linewidth=1.5,
        label=f"Mean ({stats['mean']:.1f} ms)",
    )
    ax.axhline(
        stats["p95"],
        color="darkred",
        linestyle=":",
        linewidth=1.5,
        label=f"P95 ({stats['p95']:.1f} ms)",
    )
    if (stats["max"] - stats["min"]) > 250:
        ax.axhline(
            500,
            color="firebrick",
            linestyle="--",
            linewidth=1.5,
            label="Threshold (500 ms)",
        )

    ax.set_xlabel("Time (UTC)", fontsize=13)
    ax.set_ylabel("Latency (ms)", fontsize=13)
    ax.set_title(f"Test {test_case} Run {run_id} — End-to-End Latency", fontsize=14)
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


def _export_run_csv(
    test_case: str,
    run_id: str,
    results: Dict[str, Any],
    output_dir: Path,
) -> None:
    overall = results["drops"]["overall"]
    lat = results["latency"]["stats"] or {}
    rsu_tp = results["throughput"]["rsu"]["stats"] or {}

    pd.DataFrame(
        [
            {
                "test_case": test_case,
                "run_id": run_id,
                "tru_published": overall["tru_published"],
                "rsu_received": overall["rsu_received"],
                "total_dropped": overall["dropped"],
                "drop_rate_pct": overall["drop_pct"],
                "mean_latency_ms": lat.get("mean", float("nan")),
                "p75_latency_ms": lat.get("p75", float("nan")),
                "p95_latency_ms": lat.get("p95", float("nan")),
                "std_latency_ms": lat.get("std", float("nan")),
                "max_latency_ms": lat.get("max", float("nan")),
                "mean_rsu_throughput_kbps": rsu_tp.get("mean", float("nan")),
                "min_rsu_throughput_kbps": rsu_tp.get("min", float("nan")),
                "max_rsu_throughput_kbps": rsu_tp.get("max", float("nan")),
                "p75_rsu_throughput_kbps": rsu_tp.get("p75", float("nan")),
                "p95_rsu_throughput_kbps": rsu_tp.get("p95", float("nan")),
                "std_rsu_throughput_kbps": rsu_tp.get("std", float("nan")),
                "rsu_throughput_sample_count": rsu_tp.get("count", 0),
                "unique_rsus_seen": len(results.get("rsu_ip_counts", {})),
            }
        ]
    ).to_csv(output_dir / "data_summary.csv", index=False)


def export_aggregated_summary(
    aggregated: Dict[str, Dict[str, Any]], output_path: Path
) -> None:
    rows = []
    for test_case, data in sorted(aggregated.items()):
        rows.append(
            {
                "test_case": test_case,
                "runs_aggregated": data["runs_aggregated"],
                "tru_published": data["tru_published"],
                "rsu_received": data["rsu_received"],
                "total_dropped": data["total_dropped"],
                "drop_rate_pct": data["drop_rate_pct"],
                "mean_latency_ms": data["latency"]["mean_ms"],
                "pooled_std_latency_ms": data["latency"]["pooled_std_ms"],
                "max_latency_ms": data["latency"]["max_ms"],
                "mean_rsu_throughput_kbps": data["throughput"]["mean_kbps"],
                "pooled_std_rsu_throughput_kbps": data["throughput"][
                    "pooled_std_kbps"
                ],
                "min_rsu_throughput_kbps": data["throughput"]["min_kbps"],
                "max_rsu_throughput_kbps": data["throughput"]["max_kbps"],
                "unique_rsus_seen": data["unique_rsus_seen"],
            }
        )
    pd.DataFrame(rows).to_csv(output_path, index=False)


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

    latency = results["latency"]
    rsu_series = results["throughput"]["rsu"]["series"]

    if export_plots:
        if latency["raw"] and latency["stats"]:
            _plot_latency_over_time(
                latency["timestamps"],
                latency["raw"],
                latency["stats"],
                test_case,
                run_id,
                output_dir,
            )
        if rsu_series:
            _plot_rsu_throughput(rsu_series, test_case, run_id, output_dir)

    if export_csv:
        _export_run_csv(test_case, run_id, results, output_dir)

    print(f"[✓] Reports exported to: {output_dir}")