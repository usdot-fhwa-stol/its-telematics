import datetime
import csv
import json
import sys
from datetime import timezone, date
import pytz
import re
import numpy as np
import pandas as pd


def parseVehicleBridgeLogs(logname,start_time_epoch, end_time_epoch, run_num):
    filename = logname.split(".")[0]
    print(filename)

    with open(logname, 'r') as vehicle_bridge_log:
        results_file = open(f'{filename}_{run_num}_parsed.csv', 'w')
        writer = csv.writer(results_file)
        writer.writerow(["Unit Id","Topic","Payload Timestamp", "Metadata"])



        start_time = (datetime.datetime.fromtimestamp(start_time_epoch).astimezone(pytz.utc)).replace(tzinfo=None)
        end_time = (datetime.datetime.fromtimestamp(end_time_epoch).astimezone(pytz.utc)).replace(tzinfo=None)

        # For each published message logged, convert payload to json and extract required info
        for line in vehicle_bridge_log:
            topic_name = ""
            unit_id = ""

            time_in_s = 0
            payload_timestamp_utc = datetime.datetime.fromtimestamp(1681345530)
            metadata = payload_timestamp_utc

            split = line.split("Publishing message: ")
            if len(split) < 2:
                continue


            line = line.split("Publishing message: ")[1]


            line_split = line.split("\\r\\n\"")[0]
            print(line_split)

            payload = line_split.replace('\\', "")
            payload_json = json.loads(payload)

            topic_name = payload_json['topic_name']
            unit_id = payload_json['unit_id']


            if 'timestamp' in payload_json:
                timestamp_string = str(payload_json['timestamp'])[:-1]
                time_in_s = float(timestamp_string)/1e6

            else:
                print("Couldn't find timestamp in payload, exiting")
                break

            if time_in_s == 0:
                continue

            payload_time_in_datetime = datetime.datetime.fromtimestamp(time_in_s)
            payload_timestamp_utc = (payload_time_in_datetime.astimezone(pytz.utc)).replace(tzinfo=None)
            metadata = payload_timestamp_utc
            if payload_timestamp_utc > start_time and payload_timestamp_utc < end_time:
                writer.writerow([unit_id, topic_name, payload_timestamp_utc, metadata])
            elif payload_timestamp_utc > end_time:
                    break


def read_log_table():
    log_csv = 'log_timesheet.csv'
    log_df = pd.read_csv(log_csv)
    log_df = log_df.dropna()
    log_df_dict = dict(tuple(log_df.groupby('Test Case')))
    # print(log_df_group)
    return log_df_dict


def main():
    if len(sys.argv) < 2:
        print('Run with: "python3 parse_vehicle_bridge_logs.py logname"')
    else:
        logname = sys.argv[1]


        test_case = (logname.split("/")[-1]).split("_")[0]
        runs_string = ((logname.split("/")[-1]).split("_")[1].split(".")[0])[1:]
        runs_range_split = runs_string.split('-')
        print("test case: "+ test_case)
        print("runs_string: "+ runs_string)
        if len(runs_range_split) == 1:
            runs_range = range(int(runs_range_split[0]),int(runs_range_split[0]) + 1)
        else:
            runs_range = range(int(runs_range_split[0]),int(runs_range_split[1]) + 1)


        log_timesheet_df = read_log_table()
        test_df = log_timesheet_df[test_case]

        for index in range(0, len(test_df)):
            start_time_epoch = test_df['Start Time'].values[index]
            end_time_epoch = test_df['End Time'].values[index]

            local = pytz.timezone("America/New_York")


            run_num = test_df['Run'].values[index].split('R')[1]

            if int(run_num) in runs_range:

                print("start time epoch: " + str(start_time_epoch))
                print("end time epoch: " + str(end_time_epoch))
                print(runs_range)
                print("Run num: ", run_num)
                parseVehicleBridgeLogs(logname,start_time_epoch, end_time_epoch, run_num)


if __name__ == "__main__":
    main()