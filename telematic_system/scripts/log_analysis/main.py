import argparse
import re
from collections import defaultdict
from pathlib import Path

from analyzer import analyze_system_performance
from parser import iter_parsed_entries, parse_and_categorize
from plotting import generate_plots_and_sheets

FILE_PATTERN = re.compile(r"^(c\d+)[_-](.*)run[_-](\d+)\.log$", re.I)


def process_log_file(log_path: Path, metrics: dict, all_messages: list):
    """Helper to parse a single log file and update execution metrics."""
    if not log_path or not log_path.exists():
        return

    for entry in iter_parsed_entries(str(log_path)):
        metrics["total_entries_read"] += 1
        if entry.inner_format == "unknown":
            metrics["parse_failures"] += 1

        msg = parse_and_categorize(entry, str(log_path))
        if msg:
            all_messages.append(msg)


def main():
    parser = argparse.ArgumentParser(description="RSU Telematic System Cohort Report")
    parser.add_argument(
        "-t",
        "--test",
        type=str,
        help="Specify test case (e.g., c12, c11). Defaults to all.",
    )
    parser.add_argument(
        "-d",
        "--dir",
        type=str,
        default="telematic_system/scripts/log_analysis/logs",
        help="Root logs directory (default: ./telematic_system/scripts/log_analysis/logs)",
    )

    # Arguments for Export Control (Enabled by default)
    parser.add_argument(
        "--no-plots", action="store_true", help="Disable exporting graphs"
    )
    parser.add_argument(
        "--no-csv", action="store_true", help="Disable exporting CSV data summaries"
    )

    args = parser.parse_args()

    logs_dir = Path(args.dir)
    if not logs_dir.exists():
        print(f"[!] Error: Logs directory '{logs_dir.resolve()}' not found.")
        return

    print("=" * 80)
    print(" RSU TELEMATIC SYSTEM COHORT REPORT SCRIPT")
    print(f" Logs Directory: {logs_dir.resolve()}")
    if args.test:
        print(f" Target Test:    {args.test}")
    print(f" Output Plots:   {'Disabled' if args.no_plots else 'Enabled'}")
    print(f" Output CSV:     {'Disabled' if args.no_csv else 'Enabled'}")
    print("=" * 80)

    runs = defaultdict(lambda: defaultdict(dict))

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

    total_runs_processed = 0

    for test_id, test_runs in sorted(runs.items()):
        for run_id, files in sorted(test_runs.items()):
            mgmt_log = files.get("mgmt")
            tru_log = files.get("tru")

            if not mgmt_log or not tru_log:
                continue

            total_runs_processed += 1
            print(f"\n[▶] Processing Cohort Case: {test_id} | Run: {run_id}")
            print(f"     Backend System Log: {mgmt_log.name}")
            print(f"     Field Unit Log:     {tru_log.name}")
            print("-" * 50)

            # Replaced missing RunMetrics dataclass with a clean local tracking dictionary
            metrics = {"total_entries_read": 0, "parse_failures": 0}
            all_messages = []

            process_log_file(mgmt_log, metrics, all_messages)
            process_log_file(tru_log, metrics, all_messages)

            results = analyze_system_performance(all_messages)

            print(f"  Scanned Container Lines:      {metrics['total_entries_read']:,}")
            print(f"  Uncategorized Fallbacks:      {metrics['parse_failures']:,}")
            print(f"  Parsed Operational Messages: {len(all_messages):,}")

            lat = results.get("latency_stats")
            if lat:
                print(
                    f"  Latency Average (Mean / P95): {lat['mean_ms']:.1f}ms / {lat['p95_ms']:.1f}ms"
                )
            else:
                print(
                    "  Latency Evaluation:          Insufficient matching trace events evaluated."
                )

            print(
                f"  Database records written:    {results.get('total_records_saved_to_db', 0):,}"
            )

            rsus = list(results.get("rsu_data_distributions", {}).keys())
            if rsus:
                print(f"  Network Entities Checked:     {', '.join(rsus)}")

                if not args.no_plots or not args.no_csv:
                    # generate_plots_and_sheets(
                    #     test_id,
                    #     run_id,
                    #     all_messages,
                    #     results,
                    #     export_plots=not args.no_plots,
                    #     export_csv=not args.no_csv
                    # )
                    print("on hold")
            else:
                print("  Network Entities Checked:     None")

    if total_runs_processed == 0:
        print(
            "\n[!] Could not locate complete test logs paired under common execution runs."
        )
    else:
        print(f"\n[✓] Finished parsing and exporting {total_runs_processed} runs.")
    print("=" * 80)


if __name__ == "__main__":
    main()
