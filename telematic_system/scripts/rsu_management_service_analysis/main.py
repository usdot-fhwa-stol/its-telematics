import argparse
import re
from collections import defaultdict
from pathlib import Path

from analyzer import analyze_system_performance
from parser import iter_log_messages
from plotter import generate_plots_and_sheets

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
                f"  Parsed       mgmt={results['mgmt_count']}  tru={results['tru_count']}  total={mgmt_count + tru_count:,}"
            )

            overall = results.get("drops", {}).get(
                "overall", {}
            )  # Use 'drops' instead of 'completeness'
            if overall:
                status = "PASS" if overall["drop_pct"] <= 1.0 else "FAIL"
                print(
                    f"  Completeness [{status}]  "
                    f"{overall['rsu_published']:,}/{overall['tru_published']:,} matched  "
                    f"({overall['drop_pct']:.2f}% drop)"
                )

            latency_stats = results.get("latency_stats", {})
            if latency_stats:
                print(
                    f"  Latency      "
                    f"mean={latency_stats['mean_ms']:.1f}ms  "
                    f"p95={latency_stats['p95_ms']:.1f}ms  "
                    f"std={latency_stats['std_ms']:.1f}ms"
                )

            per_topic = results.get("completeness", {}).get("per_topic", {})
            if per_topic:
                for topic, stats in sorted(per_topic.items()):
                    t_status = "PASS" if stats["drop_rate_pct"] <= 1.0 else "FAIL"
                    print(
                        f"    {topic:<40}  [{t_status}]  "
                        f"{stats['rsu_received']:,}/{stats['tru_published']:,}  "
                        f"({stats['drop_rate_pct']:.2f}% drop)"
                    )

            rsus = list(results.get("rsu_ip_counts", {}).keys())
            print(f"  RSU IPs      {', '.join(rsus) if rsus else 'none'}")

            if not args.no_plots or not args.no_csv:
                generate_plots_and_sheets(
                    test_id,
                    run_id,
                    all_messages,
                    results,
                    export_plots=not args.no_plots,
                    export_csv=not args.no_csv,
                )

    print(f"{'─' * 60}")
    if total_runs == 0:
        print("[!] No paired log files found.")
    else:
        print(f"[✓] {total_runs} run(s) processed.")
    print()

    print(f"{'─' * 60}")
    if total_runs == 0:
        print("[!] No paired log files found.")
        return  # Exit early if there is nothing to aggregate
    else:
        print(f"[✓] {total_runs} run(s) processed.")
    print()

    # --- DYNAMIC AGGREGATION BLOCK ---
    # Dynamically find the 'output' directory relative to the logs directory location
    base_output_dir = logs_dir.parent / "output"

    if not base_output_dir.exists():
        print(
            f"[!] Output directory not found for aggregation: {base_output_dir.resolve()}"
        )
        return

    import pandas as pd

    output_file = base_output_dir / "aggregated_test_cases_summary.csv"
    all_data = []

    # Iterate through all run subfolders inside the output directory
    for item in base_output_dir.iterdir():
        if item.is_dir():
            csv_path = item / "data_summary.csv"
            if csv_path.exists():
                try:
                    df = pd.read_csv(csv_path)
                    all_data.append(df)
                except Exception as e:
                    print(f"  [!] Error reading {csv_path.name} in {item.name}: {e}")

    # Process and aggregate data if files were found
    if all_data:
        combined_df = pd.concat(all_data, ignore_index=True)
        combined_df.columns = combined_df.columns.str.strip()

        # Group by test_case and calculate the requested averaged stats
        aggregated_df = combined_df.groupby("test_case", as_index=False).agg(
            averaged_message_drop_percent=("overall_drop_rate_pct", "mean"),
            averaged_mean_latency=("mean_latency_ms", "mean"),
            averaged_mean_throughput=("mean_throughput_kbps", "mean"),
        )

        # Save directly into the output folder root
        aggregated_df.to_csv(output_file, index=False)
        print(
            f"[✓] Aggregated summary successfully saved to:\n    {output_file.resolve()}\n"
        )
    else:
        print("[!] No 'data_summary.csv' files found in subfolders to aggregate.\n")


if __name__ == "__main__":
    main()
