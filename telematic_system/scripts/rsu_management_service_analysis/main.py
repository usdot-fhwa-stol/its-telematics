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
                f"  Parsed       mgmt={mgmt_count:,}  tru={tru_count:,}  total={mgmt_count + tru_count:,}"
            )

            overall = results.get("completeness", {}).get("overall", {})
            if overall:
                status = "PASS" if overall["drop_rate_pct"] <= 1.0 else "FAIL"
                print(
                    f"  Completeness [{status}]  "
                    f"{overall['rsu_received']:,}/{overall['tru_published']:,} matched  "
                    f"({overall['drop_rate_pct']:.2f}% drop)"
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

            trimmed = results.get("trimmed_latency_stats", {})
            if trimmed:
                print(
                    f"  Latency      "
                    f"mean={trimmed['mean_ms']:.1f}ms  "
                    f"p95={trimmed['p95_ms']:.1f}ms  "
                    f"std={trimmed['std_ms']:.1f}ms  "
                    f"({trimmed['outliers_removed']} outliers removed)"
                )
            else:
                print("  Latency      insufficient data")

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


if __name__ == "__main__":
    main()
