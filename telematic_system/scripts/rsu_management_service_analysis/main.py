import argparse
import re
from collections import defaultdict
from pathlib import Path

from analyzer import analyze_system_performance
from parser import iter_log_messages
from plotter import generate_plots_and_sheets

import pandas as pd
import numpy as np

FILE_PATTERN = re.compile(r"^(c\d+)[_-](.*)run[_-](\d+)\.log$", re.I)


def process_log_file(log_path: Path, all_messages: list) -> int:
    if not log_path or not log_path.exists():
        return 0
    count = 0
    for msg in iter_log_messages(str(log_path)):
        all_messages.append(msg)
        count += 1
    return count


def main():
    parser = argparse.ArgumentParser(description="RSU Log Analysis Script")
    parser.add_argument(
        "-t",
        "--test",
        type=str,
        help="Filter by test case (e.g. --test c11). Defaults to all.",
    )
    parser.add_argument(
        "-d",
        "--dir",
        type=str,
        default="telematic_system/scripts/rsu_management_service_analysis/logs",
        help="Path to logs directory.",
    )
    parser.add_argument("--no-plots", action="store_true", help="Disable plot export.")
    parser.add_argument("--no-csv", action="store_true", help="Disable CSV export.")
    args = parser.parse_args()

    logs_dir = Path(args.dir)
    if not logs_dir.exists():
        print(f"[!] Logs directory not found: {logs_dir.resolve()}")
        return

    outputs = []
    if not args.no_plots:
        outputs.append("plots")
    if not args.no_csv:
        outputs.append("csv")
    output_label = ", ".join(outputs) if outputs else "none"

    print(f"\nLogs:    {logs_dir.resolve()}")
    if args.test:
        print(f"Filter:  {args.test}")
    print(f"Export:  {output_label}\n")

    runs: dict = defaultdict(lambda: defaultdict(dict))
    for log_path in logs_dir.rglob("*.log"):
        match = FILE_PATTERN.match(log_path.name)
        if not match:
            continue
        test_id, context, run_id = match.groups()
        if args.test and test_id.lower() != args.test.lower():
            continue
        context_lower = context.lower()
        if "management" in context_lower or "mgmt" in context_lower:
            runs[test_id][run_id]["mgmt"] = log_path
        elif "tru" in context_lower or "telematic" in context_lower:
            runs[test_id][run_id]["tru"] = log_path

    total_runs = 0

    for test_id, test_runs in sorted(runs.items()):
        for run_id, files in sorted(test_runs.items()):
            mgmt_log = files.get("mgmt")
            tru_log = files.get("tru")
            if not mgmt_log or not tru_log:
                continue
    
            total_runs += 1
            print(f"{'─' * 60}")
            print(f"  Test {test_id}  |  Run {run_id}")
            print(f"  mgmt: {mgmt_log.name}")
            print(f"  tru:  {tru_log.name}")
            print(f"{'─' * 60}")
    
            all_messages = []
            mgmt_count = process_log_file(mgmt_log, all_messages)
            tru_count = process_log_file(tru_log, all_messages)
            results = analyze_system_performance(all_messages)
    
            print(
                f"  Parsed       mgmt={results['rsu_count']:,}  "
                f"tru={results['tru_count']:,}  "
                f"total={mgmt_count + tru_count:,}"
            )
    
            overall = results.get("drops", {}).get("overall", {})
            if overall:
                status = "PASS" if overall["drop_pct"] <= 1.0 else "FAIL"
                print(
                    f"  Completeness [{status}]  "
                    f"{overall['rsu_received']:,}/{overall['tru_published']:,} matched  "
                    f"({overall['drop_pct']:.2f}% drop)"
                )
    
            latency_stats = results.get("latency", {}).get("stats", {})
            if latency_stats:
                print(
                    f"  Latency      "
                    f"mean={latency_stats['mean']:.1f}ms  "
                    f"p95={latency_stats['p95']:.1f}ms  "
                    f"std={latency_stats['std']:.1f}ms"
                )
    
            per_topic = results.get("drops", {}).get("per_topic", {})
            if per_topic:
                for topic, stats in sorted(per_topic.items()):
                    t_status = "PASS" if stats["drop_pct"] <= 1.0 else "FAIL"
                    print(
                        f"    {topic:<40}  [{t_status}]  "
                        f"{stats['rsu_received']:,}/{stats['tru_published']:,}  "
                        f"({stats['drop_pct']:.2f}% drop)"
                    )
    
            rsus = list(results.get("rsu_ip_counts", {}).keys())
            print(f"  RSU IPs      {', '.join(rsus) if rsus else 'none'}")
    
            if not args.no_plots or not args.no_csv:
                generate_plots_and_sheets(
                    test_id,
                    run_id,
                    results,
                    export_plots=not args.no_plots,
                    export_csv=not args.no_csv,
                )
                
    print(f"{'─' * 60}")
    if total_runs == 0:
        print("[!] No paired log files found.")
        return
    else:
        print(f"[✓] {total_runs} run(s) processed.")
    print()
    
    base_output_dir = logs_dir.parent / "output"
    if not base_output_dir.exists():
        print(f"[!] Output directory not found: {base_output_dir.resolve()}")
        return
    
    output_file = base_output_dir / "aggregated_test_cases_summary.csv"
    all_data = []
    
    for item in sorted(base_output_dir.iterdir()):
        if item.is_dir():
            csv_path = item / "data_summary.csv"
            if csv_path.exists():
                try:
                    all_data.append(pd.read_csv(csv_path))
                except Exception as e:
                    print(f"  [!] Error reading {csv_path}: {e}")
    
    if not all_data:
        print("[!] No 'data_summary.csv' files found to aggregate.")
        return
    
    combined = pd.concat(all_data, ignore_index=True)
    combined.columns = combined.columns.str.strip()
    
    aggregated_rows = []
    
    for test_case, group in combined.groupby("test_case"):
        tru_published = group["tru_published"].sum()
        rsu_received = group["rsu_received"].sum()
        total_dropped = group["total_dropped"].sum()
        drop_rate_pct = (
            round(total_dropped / tru_published * 100.0, 3) if tru_published > 0 else 0.0
        )
    
        def pooled_std(
            ns: np.ndarray, means: np.ndarray, stds: np.ndarray
        ) -> float:
            total_n = ns.sum()
            if total_n <= 0:
                return float("nan")
            grand_mean = float(np.sum(ns * means) / total_n)
            pooled_var = float(
                np.sum(ns * (stds**2 + means**2)) / total_n - grand_mean**2
            )
            return float(np.sqrt(max(pooled_var, 0.0)))
    
        # Latency — weighted mean + pooled std
        lat_weights = group["rsu_received"].values.astype(float)
        lat_means = group["mean_latency_ms"].values.astype(float)
        lat_stds = group["std_latency_ms"].values.astype(float)
        total_lat_weight = lat_weights.sum()
    
        weighted_mean_latency = (
            float(np.average(lat_means, weights=lat_weights))
            if total_lat_weight > 0
            else float("nan")
        )
        pooled_std_latency = pooled_std(lat_weights, lat_means, lat_stds)
    
        # Throughput — weighted mean + pooled std (now that we have sample counts)
        tp_ns = group["rsu_throughput_sample_count"].values.astype(float)
        tp_means = group["mean_rsu_throughput_kbps"].values.astype(float)
        tp_stds = group["std_rsu_throughput_kbps"].values.astype(float)
        total_tp_weight = tp_ns.sum()
    
        weighted_mean_throughput = (
            float(np.average(tp_means, weights=tp_ns))
            if total_tp_weight > 0
            else float("nan")
        )
        pooled_std_throughput = pooled_std(tp_ns, tp_means, tp_stds)
    
        aggregated_rows.append(
            {
                "test_case": test_case,
                "runs_aggregated": len(group),
                # Drop analysis
                "tru_published": int(tru_published),
                "rsu_received": int(rsu_received),
                "total_dropped": int(total_dropped),
                "drop_rate_pct": drop_rate_pct,
                # Latency
                "mean_latency_ms": round(weighted_mean_latency, 4),
                "pooled_std_latency_ms": round(pooled_std_latency, 4),
                "max_latency_ms": round(group["max_latency_ms"].max(), 4),
                # RSU throughput
                "mean_rsu_throughput_kbps": round(weighted_mean_throughput, 4),
                "pooled_std_rsu_throughput_kbps": round(pooled_std_throughput, 4),
                "min_rsu_throughput_kbps": round(
                    group["min_rsu_throughput_kbps"].min(), 4
                ),
                "max_rsu_throughput_kbps": round(
                    group["max_rsu_throughput_kbps"].max(), 4
                ),
                # Misc
                "unique_rsus_seen": int(group["unique_rsus_seen"].max()),
            }
        )
    
    aggregated_df = pd.DataFrame(aggregated_rows)
    aggregated_df.to_csv(output_file, index=False)
    print(f"[✓] Aggregated summary saved to:\n    {output_file.resolve()}\n")


if __name__ == "__main__":
    main()
