import argparse
import re
import zoneinfo
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

from analyzer import aggregate_from_csvs, analyze_run
from parser import iter_log_messages
from plotter import export_aggregated_summary, generate_plots_and_sheets

FILE_PATTERN = re.compile(r"^(c\d+)[_-](.*)run[_-](\d+)\.log$", re.I)

OUTPUT_DIR = Path(
    "telematic_system/scripts/rsu_management_service_analysis/output"
)

_LOCAL_TZ = zoneinfo.ZoneInfo("America/New_York")
_UTC = timezone.utc

_LATENCY_P95_THRESHOLD_MS = 1000.0


def _parse_local_dt(value: str) -> datetime:
    formats = [
        "%Y-%m-%d %H:%M:%S.%f",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
    ]
    for fmt in formats:
        try:
            dt = datetime.strptime(value, fmt)
            return dt.replace(tzinfo=_LOCAL_TZ).astimezone(_UTC)
        except ValueError:
            continue
    raise ValueError(f"Unrecognised datetime format: {value!r}")


def _collect_messages(
    log_path: Path,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
) -> tuple[list, int]:
    messages = []
    for msg in iter_log_messages(
        str(log_path), start_time=start_time, end_time=end_time
    ):
        messages.append(msg)
    return messages, len(messages)


def _discover_runs(
    logs_dir: Path,
    test_filter: Optional[str] = None,
    run_filter: Optional[str] = None,
) -> dict:
    runs: dict = defaultdict(lambda: defaultdict(dict))
    for log_path in logs_dir.rglob("*.log"):
        match = FILE_PATTERN.match(log_path.name)
        if not match:
            continue
        test_id, context, run_id = match.groups()
        if test_filter and test_id.lower() != test_filter.lower():
            continue
        if run_filter and run_id != run_filter.zfill(len(run_id)):
            continue
        context_lower = context.lower()
        if "management" in context_lower or "mgmt" in context_lower:
            runs[test_id][run_id]["mgmt"] = log_path
        elif "tru" in context_lower or "telematic" in context_lower:
            runs[test_id][run_id]["tru"] = log_path
    return runs


def _print_run_summary(
    test_id: str, run_id: str, results: Dict[str, Any]
) -> None:
    overall = results["drops"]["overall"]
    status = "PASS" if overall["drop_pct"] <= 1.0 else "FAIL"
    print(
        f"  Completeness [{status}]  "
        f"{overall['rsu_received']:,}/{overall['tru_published']:,} matched  "
        f"({overall['drop_pct']:.2f}% drop)"
    )

    lat_stats = results["latency"]["stats"]
    if lat_stats:
        lat_status = (
            "PASS"
            if lat_stats["p95"] < _LATENCY_P95_THRESHOLD_MS
            else "FAIL"
        )
        print(
            f"  Latency      [{lat_status}]  "
            f"mean={lat_stats['mean']:.1f}ms  "
            f"p95={lat_stats['p95']:.1f}ms  "
            f"std={lat_stats['std']:.1f}ms  "
            f"(threshold: p95 < {_LATENCY_P95_THRESHOLD_MS:.0f}ms)"
        )
    else:
        print("  Latency      [N/A]  no latency data available")

    rsu_tp = results["throughput"]["rsu"]["stats"]
    if rsu_tp:
        print(
            f"  Throughput   "
            f"mean={rsu_tp['mean']:.2f} KB/s  "
            f"p95={rsu_tp['p95']:.2f} KB/s  "
            f"std={rsu_tp['std']:.2f} KB/s"
        )
    else:
        print("  Throughput   [N/A]  no throughput data available")

    rsus = list(results["rsu_ip_counts"].keys())
    print(f"  RSU IPs      {', '.join(rsus) if rsus else 'none'}")


def _process_runs(
    runs: dict,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    export_plots: bool = True,
    export_csv: bool = True,
    silent: bool = False,
) -> list[tuple[str, Dict[str, Any]]]:
    """Analyze and optionally export per-run results. Returns labeled results."""
    labeled_results: list[tuple[str, Dict[str, Any]]] = []
    total_runs = 0

    for test_id, test_runs in sorted(runs.items()):
        for run_id, files in sorted(test_runs.items()):
            mgmt_log = files.get("mgmt")
            tru_log = files.get("tru")
            if not mgmt_log or not tru_log:
                continue

            total_runs += 1

            if not silent:
                print(f"{'─' * 60}")
                print(f"  Test {test_id}  |  Run {run_id}")
                print(f"  mgmt: {mgmt_log.name}")
                print(f"  tru:  {tru_log.name}")
                print(f"{'─' * 60}")

            mgmt_messages, mgmt_count = _collect_messages(
                mgmt_log, start_time=start_time, end_time=end_time
            )
            tru_messages, tru_count = _collect_messages(
                tru_log, start_time=start_time, end_time=end_time
            )
            results = analyze_run(mgmt_messages + tru_messages)

            if not silent:
                print(
                    f"  Parsed       mgmt={results['rsu_count']:,}  "
                    f"tru={results['tru_count']:,}  "
                    f"total={mgmt_count + tru_count:,}"
                )
                _print_run_summary(test_id, run_id, results)

            labeled_results.append((test_id, results))

            if export_plots or export_csv:
                generate_plots_and_sheets(
                    test_id,
                    run_id,
                    results,
                    export_plots=export_plots,
                    export_csv=export_csv,
                )

    return labeled_results, total_runs


def main() -> None:
    parser = argparse.ArgumentParser(description="RSU Log Analysis Script")
    parser.add_argument(
        "-t",
        "--test",
        type=str,
        help="Filter by test case (e.g. --test c11). Defaults to all.",
    )
    parser.add_argument(
        "-r",
        "--run",
        type=str,
        default=None,
        help="Filter by run ID (e.g. --run 01). Defaults to all.",
    )
    parser.add_argument(
        "-d",
        "--dir",
        type=str,
        default="telematic_system/scripts/rsu_management_service_analysis/logs",
        help="Path to logs directory.",
    )
    parser.add_argument(
        "--start",
        type=str,
        default=None,
        metavar="DATETIME",
        help=(
            "Only include log messages at or after this time "
            "(America/New_York). "
            'Formats: "YYYY-MM-DD HH:MM:SS.fff", "YYYY-MM-DD HH:MM:SS", '
            'or "YYYY-MM-DD".'
        ),
    )
    parser.add_argument(
        "--end",
        type=str,
        default=None,
        metavar="DATETIME",
        help=(
            "Only include log messages at or before this time "
            "(America/New_York). "
            'Formats: "YYYY-MM-DD HH:MM:SS.fff", "YYYY-MM-DD HH:MM:SS", '
            'or "YYYY-MM-DD".'
        ),
    )
    parser.add_argument(
        "--no-plots", action="store_true", help="Disable plot export."
    )
    parser.add_argument(
        "--no-csv", action="store_true", help="Disable CSV export."
    )
    parser.add_argument(
        "--no-aggregate",
        action="store_true",
        help="Disable aggregated summary CSV export.",
    )
    args = parser.parse_args()

    logs_dir = Path(args.dir)
    if not logs_dir.exists():
        print(f"[!] Logs directory not found: {logs_dir.resolve()}")
        return

    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None

    if args.start:
        try:
            start_time = _parse_local_dt(args.start)
        except ValueError:
            print(
                f'[!] Invalid --start value: "{args.start}". '
                'Use "YYYY-MM-DD HH:MM:SS.fff", "YYYY-MM-DD HH:MM:SS", '
                'or "YYYY-MM-DD".'
            )
            return

    if args.end:
        try:
            end_time = _parse_local_dt(args.end)
        except ValueError:
            print(
                f'[!] Invalid --end value: "{args.end}". '
                'Use "YYYY-MM-DD HH:MM:SS.fff", "YYYY-MM-DD HH:MM:SS", '
                'or "YYYY-MM-DD".'
            )
            return

    if start_time and end_time and start_time >= end_time:
        print("[!] --start must be earlier than --end.")
        return

    outputs = []
    if not args.no_plots:
        outputs.append("plots")
    if not args.no_csv:
        outputs.append("csv")

    print(f"\nLogs:    {logs_dir.resolve()}")
    if args.test:
        print(f"Filter:  {args.test}")
    if args.run:
        print(f"Run:     {args.run}")
    if start_time:
        print(f"Start:   {args.start} (ET)  →  {start_time.isoformat()} UTC")
    if end_time:
        print(f"End:     {args.end} (ET)  →  {end_time.isoformat()} UTC")
    print(f"Export:  {', '.join(outputs) if outputs else 'none'}\n")

    filtered_runs = _discover_runs(
        logs_dir, test_filter=args.test, run_filter=args.run
    )
    labeled_results, total_runs = _process_runs(
        filtered_runs,
        start_time=start_time,
        end_time=end_time,
        export_plots=not args.no_plots,
        export_csv=not args.no_csv,
    )

    print(f"{'─' * 60}")
    if total_runs == 0:
        print("[!] No paired log files found.")
        return

    print(f"[✓] {total_runs} run(s) processed.")
    print()

    if not args.no_csv and not args.no_aggregate:
            aggregated = aggregate_from_csvs(OUTPUT_DIR, test_filter=args.test)
            if aggregated:
                OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
                output_file = OUTPUT_DIR / "aggregated_test_cases_summary.csv"
                export_aggregated_summary(aggregated, output_file)
                print(
                    f"[✓] Aggregated summary ({sum(v['runs_aggregated'] for v in aggregated.values())} run(s)) saved to:\n"
                    f"    {output_file.resolve()}\n"
                )
            else:
                print("[!] No per-run data_summary.csv files found in output folder for aggregation.")


if __name__ == "__main__":
    main()