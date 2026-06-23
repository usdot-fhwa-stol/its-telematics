import argparse
import re
from collections import defaultdict
from pathlib import Path

from analyzer import analyze_system_performance
from parser import iter_log_messages
from plotting import generate_plots_and_sheets

FILE_PATTERN = re.compile(r"^(c\d+)[_-](.*)run[_-](\d+)\.log$", re.I)


def process_log_file(log_path: Path, all_messages: list) -> int:
    """Parse a single log file and return total messages collected."""
    if not log_path or not log_path.exists():
        return 0

    count = 0
    for msg in iter_log_messages(str(log_path)):
        all_messages.append(msg)
        count += 1

    return count


def main():
    parser = argparse.ArgumentParser(
        description="Verification Test Log Analysis Script"
    )
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
    print("VERIFICATION TEST LOG ANALYSIS SCRIPT")
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
            print(f"\n[▶] Processing Test: {test_id} | Run: {run_id}")
            print(f"     RSU Management Service Log: {mgmt_log.name}")
            print(f"     TRU Instance Log:     {tru_log.name}")
            print("-" * 50)

            metrics = {"total_entries_read": 0, "parse_failures": 0}
            all_messages = []

            mgmt_count = process_log_file(mgmt_log, all_messages)
            tru_count = process_log_file(tru_log, all_messages)
            total_parsed = mgmt_count + tru_count

            results = analyze_system_performance(all_messages)

            print(f"  Parsed Logs:  {total_parsed:,}")
            print(f"  Unparsed Logs:      {metrics['parse_failures']:,}")

            trimmed = results.get("trimmed_latency_stats", {})
            if trimmed:
                print(
                    f"  Latency (trimmed) — Mean: {trimmed['mean_ms']:.1f}ms | "
                    f"p95: {trimmed['p95_ms']:.1f}ms | "
                    f"Std: {trimmed['std_ms']:.1f}ms "
                    f"(removed {trimmed['outliers_removed']} outliers)"
                )
            else:
                print("  Latency Evaluation: Insufficient data.")

            print(
                f"  Database records written:     "
                f"{results.get('total_records_saved_to_db', 0):,}"
            )

            rsus = list(results.get("rsu_data_distributions", {}).keys())
            if rsus:
                print(f"  Unique RSU IPs:     {', '.join(rsus)}")

                if not args.no_plots or not args.no_csv:
                    generate_plots_and_sheets(
                        test_id,
                        run_id,
                        all_messages,
                        results,
                        export_plots=not args.no_plots,
                        export_csv=not args.no_csv,
                    )
            else:
                print("  Unique RSU IPs:     None")

    if total_runs_processed == 0:
        print(
            "\n[!] Could not locate any paired tru instance logs and rsu management service logs."
        )
    else:
        print(f"\n[✓] Finished parsing and exporting {total_runs_processed} runs.")
    print("=" * 80)


if __name__ == "__main__":
    main()
