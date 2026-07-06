# Prerequisite
- Preferred operating system ubuntu 20 or above
- Python environment setup
    1. Install python
        ```
        sudo apt update
        sudo apt install python3
        ```
    2. Check python version
        ```
        python3 --version
        ```
        Recommended version is `3.10`
    3. Create a virtual environment. Navigate to `cda-telematics/telematic_system/scripts/log_analysis` directory, and run below command:
        ```
        python3 -m venv .venv
        ```
    4. Activate virtual environment.
        ```
        .venv\bin\activate
        ```
        Note: Need to run this command to activate virtual environment every time openning a new terminal.
- Install depedencies:
    - Install debian packages
        ```
        sudo apt install libcairo2-dev libxt-dev libgirepository1.0-dev

        ```
    - Install python packages
        ```
        pip install -r requirements.txt
        ```
- Clone repos:
    - Clone cda-telematics GitHub repos
    ```
    git clone https://github.com/usdot-fhwa-stol/cda-telematics.git
    cd cda-telematics
    ```
- Download `log_timesheet.csv`
Most of the python analysis scripts refer to `log_timesheet.csv` for test runs and their duration. Since this `log_timesheet.csv` is generated during the verification/validation testing, ensure download the `log_timesheet.csv` file to this `log_analysis`  folder before executing any python scripts.


# Process V2xHub bridge log
1. Navigate to `cda-telematics/telematic_system/scripts/log_analysis` directory
2. Download v2xhub logs to the current folder.
3. Run command to generate data publishing metrics.
    ```
    python3 parse_v2xhub_telematic_plugin_logs.py  --log_file_path <input-file-name>

    e.g:
    python3 parse_v2xhub_telematic_plugin_logs.py  --log_file_path T20_R6-13_V2XHub.log
    ```
    It will generate parsed bridge log in csv files.

# Process Streets bridge log
1. Navigate to `cda-telematics/telematic_system/scripts/log_analysis` directory
2. Download streets bridge logs to the current folder.
3. Run command to generate data publishing metrics.
    ```
    python3 parse_streets_bridge_logs.py  <path-to-log-file>
    ```
    It will generate parsed bridge log in csv files.

# Process Cloud bridge log
1. Navigate to `cda-telematics/telematic_system/scripts/log_analysis` directory
2. Download streets bridge logs to the current folder.
3. Run command to generate data publishing metrics.
    ```
    parse_cloud_bridge_logs.py <path-to-log-file>

    e.g:
    python3 parse_cloud_bridge_logs.py  T20_R6-9_carma_cloud.log
    python3 parse_cloud_bridge_logs.py  T20_R10-13_carma_cloud.log
    ```
    It will generate parsed bridge log in csv files.

# Process Vehicle bridge log
1. Navigate to `cda-telematics/telematic_system/scripts/log_analysis` directory
2. Download vehicle bridge logs to the current folder.
3. Run command to generate data publishing metrics.
    ```
    python3 parse_vehicle_bridge_logs.py  <path-to-log-file>

    e.g:
    python3 parse_vehicle_bridge_logs.py T20_R6_R13_fusion/T20_R6_fusion.log
    ```
    It will generate parsed bridge log in csv files.

# Process Messaging Server log
1. Navigate to `cda-telematics/telematic_system/scripts/log_analysis` directory
2. Download messaging server logs to the current folder.
3. Run command to generate data publishing metrics.
    ```
    parse_messaging_server_logs.py <path-to-log-file>

    e.g:
    python3 parse_messaging_server_logs.py T20_R6-13_messaging_server.log
    ```
    It will generate parsed messaging server delay and message drop log in csv files.

# Metric analysis
## Latency
1. Create a folder with the test case name in the current `log_analysis` folder.
For example, test case 20:
    ```
    mkdir T20
    ```
2. Copy all the generated T20_*_messaging_server_*_delay_parsed.csv files to this new folder `T20`
3. Run plot latency script to generate plots for those csv files with delay metrics in folder `T20`.
    ```
    python3 latencyPlotter.py <folder-name or test case name>

    e.g:
    python3 latencyPlotter.py T20
        ```
    The generated plots are saved into `output` folder.
## Message loss
1. Create a folder with the test case name and message drop in the current `log_analysis` folder.
For example, test case 20:
    ```
    mkdir T20_message_drop

    ```
2. Copy all generated  <test case name>_*_messaging_server_*_message_drop_parsed.csv files to this new folder `<test case name>_message_drop`.
3. Copy all generated bridge csv files into the same folder
4. Run message drop analysis script to analyze all files in the `<test case name>_message_drop` folder.
    ```
    python3 get_message_drop.py <folder-name or test case name>_message_drop

    e.g:
    python3 get_message_drop.py T20_message_drop
    ```
Generated result is similar to below:
<br>
![Message_loss_result](https://github.com/user-attachments/assets/15fefacb-e929-4340-a0e3-6d7f6441ba8e)

## Rosbag Processing time
1. Navigate to `cda-telematics/telematic_system/scripts/log_analysis` directory
2. Download historical data processing service logs to the current folder.
3. Run command to generate data publishing metrics.
    ```
    parse_processing_service_logs.py <path-to-log-file>

    e.g:
    python3 parse_processing_service_logs.py T19_R1_R5_rosbag2.log
    ```
    It will print the time required to process each rosbag .mcap file and the average time required for all the files in the log.
