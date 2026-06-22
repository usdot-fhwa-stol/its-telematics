# main.py
import sys
import os
import re
from pathlib import Path
from models import RunMetrics
from parser import iter_parsed_entries
from categorizer import parse_and_categorize
from analyzer import analyze_system_performance
from plotting import generate_plots_and_sheets

MGMT_PATTERNS = [re.compile(r"management", re.I), re.compile(r"msrun", re.I), re.compile(r"mgmt", re.I)]
TRU_PATTERNS = [re.compile(r"telematic", re.I), re.compile(r"tru", re.I), re.compile(r"run", re.I)]
RUN_NUM_RE = re.compile(r"run[_-](\d+)", re.I)

def get_run_number(filename: str) -> str:
    match = RUN_NUM_RE.search(filename)
    return match.group(1) if match else "01"

def is_mgmt_file(filename: str) -> bool:
    return any(pat.search(filename) for pat in MGMT_PATTERNS)

def is_tru_file(filename: str) -> bool:
    if is_mgmt_file(filename):
        return False
    return any(pat.search(filename) for pat in TRU_PATTERNS)

def discover_run_pairs(logs_root: Path) -> dict:
    test_cases = {}
    if not logs_root.exists():
        print(f"[!] Error: Path '{logs_root}' does not exist.")
        return test_cases

    subdirs = [d for d in logs_root.iterdir() if d.is_dir()]
    for folder in subdirs:
        tc_name = folder.name
        test_cases[tc_name] = {}
        log_files = list(folder.glob("*.log"))
        
        mgmt_files = {}
        tru_files = {}
        for filepath in log_files:
            fname = filepath.name
            run_id = get_run_number(fname)
            if is_mgmt_file(fname):
                mgmt_files[run_id] = filepath
            elif is_tru_file(fname):
                tru_files[run_id] = filepath

        all_runs = set(mgmt_files.keys()) | set(tru_files.keys())
        for run_id in sorted(all_runs):
            test_cases[tc_name][run_id] = {
                "mgmt": mgmt_files.get(run_id),
                "tru": tru_files.get(run_id)
            }
    return test_cases

def run_pipeline(test_case: str, run_id: str, mgmt_log_path: Path, tru_log_path: Path):
    metrics = RunMetrics()
    all_messages = []

    if mgmt_log_path and mgmt_log_path.exists():
        for entry in iter_parsed_entries(str(mgmt_log_path)):
            metrics.total_entries_read += 1
            if entry.inner_format == "unknown":
                metrics.parse_failures += 1
            msg = parse_and_categorize(entry, str(mgmt_log_path))
            if msg:
                all_messages.append(msg)
                metrics.by_type[msg.message_type] = metrics.by_type.get(msg.message_type, 0) + 1
                metrics.by_level[msg.level] = metrics.by_level.get(msg.level, 0) + 1

    if tru_log_path and tru_log_path.exists():
        for entry in iter_parsed_entries(str(tru_log_path)):
            metrics.total_entries_read += 1
            if entry.inner_format == "unknown":
                metrics.parse_failures += 1
            msg = parse_and_categorize(entry, str(tru_log_path))
            if msg:
                all_messages.append(msg)
                metrics.by_type[msg.message_type] = metrics.by_type.get(msg.message_type, 0) + 1
                metrics.by_level[msg.level] = metrics.by_level.get(msg.level, 0) + 1

    results = analyze_system_performance(all_messages)

    print(f"  Scanned Container Lines:     {metrics.total_entries_read:,}")
    print(f"  Uncategorized Fallbacks:     {metrics.parse_failures:,}")
    print(f"  Parsed Operational Messages: {len(all_messages):,}")
    
    lat = results["latency_stats"]
    if lat:
        print(f"  Latency Average (Mean / P95): {lat['mean_ms']:.1f}ms / {lat['p95_ms']:.1f}ms")
    else:
        print("  Latency Evaluation:          Insufficient matching trace events evaluated.")

    print(f"  Database records written:    {results['total_records_saved_to_db']:,}")

    rsus = list(results["rsu_data_distributions"].keys())
    if rsus:
        print(f"  Network Entities Checked:    {', '.join(rsus)}")
        # Run visual plotter and sheets generator
        generate_plots_and_sheets(test_case, run_id, all_messages, results)
    else:
        print("  Network Entities Checked:    None")


def main():
    default_dir = Path(__file__).parent / "logs"
    root_path = Path(sys.argv[1]) if len(sys.argv) > 1 else default_dir

    print("=" * 80)
    print(f" RSU TELEMATIC SYSTEM COHORT REPORT SCRIPT")
    print(f" Root Directory: {root_path.resolve()}")
    print("=" * 80)

    test_runs = discover_run_pairs(root_path)
    total_runs_processed = 0
    
    for tc, runs in sorted(test_runs.items()):
        for run_id, files in sorted(runs.items()):
            if not files["mgmt"] or not files["tru"]:
                continue
                
            total_runs_processed += 1
            print(f"\n[▶] Processing Cohort Case: {tc} | Run: {run_id}")
            print(f"     Backend System Log: {files['mgmt'].name}")
            print(f"     Field Unit Log:     {files['tru'].name}")
            print("-" * 50)
            
            run_pipeline(tc, run_id, files["mgmt"], files["tru"])
            
    if total_runs_processed == 0:
        print("\n[!] Could not locate complete test logs paired under common execution runs.")
    else:
        print(f"\n[✓] Finished parsing and exporting {total_runs_processed} runs.")
    print("=" * 80)

if __name__ == "__main__":
    main()