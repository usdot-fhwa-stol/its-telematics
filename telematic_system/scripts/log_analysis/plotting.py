# plotting.py
import os
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
import numpy as np
from pathlib import Path
from typing import List, Dict, Any

sns.set_theme(style="whitegrid")

def clean_latency_outliers_iqr(delays: List[float]) -> List[float]:
    """Applies IQR filtering to remove anomalous network execution noise."""
    if not delays:
        return []
    arr = np.array(delays)
    q1 = np.percentile(arr, 25)
    q3 = np.percentile(arr, 75)
    iqr = q3 - q1
    upper = q3 + 1.5 * iqr
    lower = q1 - 1.5 * iqr
    return arr[(arr >= lower) & (arr <= upper)].tolist()

def generate_plots_and_sheets(test_case: str, run_id: str, messages: List[Any], results: Dict[str, Any]):
    """Draws metrics distribution, throughput curves, and saves a summary csv."""
    output_dir = Path("output") / f"{test_case}_run_{run_id}"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # 1. LATENCY DISTRIBUTION
    latencies = []
    for msg in messages:
        if "payload_timestamp" in msg.fields and "influx_timestamp_ms" in msg.fields:
            try:
                p_ts = int(msg.fields["payload_timestamp"])
                i_ts = int(msg.fields["influx_timestamp_ms"])
                delta = (i_ts - p_ts) if p_ts > 9_999_999_999 else (i_ts - p_ts * 1000)
                latencies.append(delta / 1000.0) # Convert to seconds
            except (ValueError, TypeError):
                pass
                
    cleaned_seconds = clean_latency_outliers_iqr(latencies)
    
    if cleaned_seconds:
        plt.figure(figsize=(10, 6))
        sns.histplot(cleaned_seconds, kde=True, color="teal", bins=30)
        plt.xlim(0, max(cleaned_seconds) * 1.1)
        plt.xlabel("End-to-End Latency (Seconds)", fontsize=13)
        plt.ylabel("Occurrences Count", fontsize=13)
        plt.title(f"{test_case} (Run {run_id}) Latency Histogram", fontsize=15)
        plt.tight_layout()
        plt.savefig(output_dir / "latency_density.png")
        plt.close()
        
    # 2. THROUGHPUT TIMELINE (Data points over active epoch windows)
    time_series = [msg.timestamp for msg in messages]
    if time_series:
        df_time = pd.DataFrame({"time": time_series})
        df_time["second"] = df_time["time"].dt.floor("s")
        throughput = df_time.groupby("second").size().reset_index(name="msgs_per_sec")
        
        plt.figure(figsize=(12, 5))
        sns.lineplot(data=throughput, x="second", y="msgs_per_sec", marker="o", color="royalblue", linewidth=1.5)
        plt.xlabel("Transmission Wall Time (UTC)", fontsize=13)
        plt.ylabel("Inbound Messages / Sec", fontsize=13)
        plt.title(f"{test_case} (Run {run_id}) Real-Time System Throughput", fontsize=15)
        plt.xticks(rotation=45)
        plt.tight_layout()
        plt.savefig(output_dir / "throughput_timeline.png")
        plt.close()

    # 3. DATA DISTRIBUTION BY SOURCE ADAPTER (RSU IP)
    rsu_counts = results.get("rsu_data_distributions", {})
    if rsu_counts:
        df_rsu = pd.DataFrame(list(rsu_counts.items()), columns=["RSU IP", "Count"])
        plt.figure(figsize=(8, 5))
        sns.barplot(data=df_rsu, x="RSU IP", y="Count", palette="viridis")
        plt.xlabel("Network Target IP", fontsize=13)
        plt.ylabel("Captured Transmissions", fontsize=13)
        plt.title(f"{test_case} Traffic Completeness Profile", fontsize=15)
        plt.tight_layout()
        plt.savefig(output_dir / "rsu_load_spread.png")
        plt.close()

    # 4. SYSTEM SPREADSHEEET EXPORTS (CSV)
    sheet_path = output_dir / "execution_summary.csv"
    lat_stats = results.get("latency_stats", {})
    summary_data = {
        "test_case": [test_case],
        "run_id": [run_id],
        "total_messages": [len(messages)],
        "mean_latency_ms": [lat_stats.get("mean_ms", np.nan)],
        "p95_latency_ms": [lat_stats.get("p95_ms", np.nan)],
        "db_records_written": [results.get("total_records_saved_to_db", 0)],
        "unique_rsus_seen": [len(rsu_counts)]
    }
    pd.DataFrame(summary_data).to_csv(sheet_path, index=False)
    print(f"      [✓] Visual reports & structural raw analysis exported to: '{output_dir}'")