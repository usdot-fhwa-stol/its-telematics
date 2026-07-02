# RSU Management Service Analysis
This script analyzes log files from an RSU management service and a TRU instance to produce graphs and statistics on data completeness, system latency, and throughput loss.

## Metrics
| Index | Metric | Category | Mathematical Calculation | Pass Criteria |
| --- | --- | --- | --- | --- |
| **1** | Percentage of messages received by the Telematics on the TRU vs the messages written to the database | Data Completeness | Messages logged in the RSU Management Service - Messages logged in the TRU | Data Loss Rate ≤ 1% |
| **2** | Time (in seconds) taken to process a message from reception in telematics till the time it was written to influxdb. | System Latency | Time at which the message is written to influx - Time at which the message is received by the TRU | Latency < 1s |
| **3** | Number of bytes processed by Telematics per second | Throughput Loss | Number of bytes received by the RSU Management Service per second - Number of bytes received by the TRU per second | — |

## Your data
1. Create a "logs" folder under this directory.
2. Create folders per test run, e.g. "c11" "c12".
3. Place your rsu management service log run and tru instance run log files pairs into their respective test folders.
 
*Note - Those files should be in following formats:*
  - *<test>-rsu-management-service-run-<run>.log (Ex: c11-rsu-management-service-run-01.log)*
  - *<test>_tru-instance-<instance>-run-<run>.log (Ex: c11_tru-instance-1-run-01.log)*


## Usage
Run the following command to analyze your log files:
```sh
python python telematic_system/scripts/rsu_management_service_analysis/main.py # Graphs and statistics produced for all tests

--logs <path_to_logs_folder> # Specify the path to custom log folder (optional)

--test <test_name> # Specify the test to analyze (optional) (Ex: c11)

--run <run_id> # Specify the run ID to analyze (optional) (Ex: 01)

--start <start_time> # Specify the start time for analysis (optional) (Ex: "2025-09-01 10:00:00")

--end <end_time> # Specify the end time for analysis (optional) (Ex: "2025-09-01 12:00:00")

--no-plots # Disable plotting of graphs (optional)

--no-csv # Disable CSV output of results (optional)

--no-aggregate # Disable aggregated summary CSV output (optional)
```


## Output
The scripts will create graphs and data summaries in an untracked "output" folder under this directory.
