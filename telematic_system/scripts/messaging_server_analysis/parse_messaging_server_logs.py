import datetime
import csv
import json
import sys
from datetime import timezone, date
import pytz
import re
import numpy as np
import pandas as pd
import glob

'''
This script reads docker logs from the messaging server according to timestamps defined in the test log sheet.
The log sheet is defined as a csv with columns (test_num, run_num, epoch_start_time, epoch_end_time)

Messaging_server logs are parsed to extract the unit_id, topic name , payload timestamp, the log_timestamp(Time at which message was recorded).
The script returns 2 csv's, one contains the calculated Delay, which is the difference between the log timestamp and payload timestamp.
The second csv returned is for message drop analysis.
'''

def parseInfluxfile(logname, start_time_epoch, end_time_epoch, run_num):
    fileName = logname.split(".")[0]
    with open(logname,'r') as influx_log:

        delay_results_file = open('{}_{}_delay_parsed.csv'.format(fileName,run_num), 'w')
        delay_writer = csv.writer(delay_results_file)
        delay_writer.writerow(["Unit Id","Topic","Message Time","Log_Timestamp(s)", "Delay(s)"])

        message_drop_results_file = open('{}_{}_message_drop_parsed.csv'.format(fileName, run_num), 'w')
        message_drop_writer = csv.writer(message_drop_results_file)
        message_drop_writer.writerow(["Unit Id","Topic","Message Time","Log_Timestamp(s)"])

        start_time = (datetime.datetime.fromtimestamp(start_time_epoch).astimezone(pytz.utc)).replace(tzinfo=None)
        end_time = (datetime.datetime.fromtimestamp(end_time_epoch).astimezone(pytz.utc)).replace(tzinfo=None)
        print("Start time: ", start_time)
        print("End time: ", end_time)


        topic_name = ""
        time_in_s = 0
        sec = 0
        nanosec = 0
        skipped_lines_count = 0
        unique_topics = []

        delay_records = []
        negative_delay_row_counts = 0
        total_rows = 0

        search_string = " Sending to influxdb"

        count = 0

        # Search through lines in messaging server logs to get payload info for message being sent to influx
        # Since the message is a flattened json, it needs to be split manually and read to extract required info (unit_id, topic name, message/payload timestamp and log timestamp)
        for line in influx_log:
            split_line = line.split(":")
            if search_string in split_line:
                # Get log json
                try:
                    json_object = json.loads(line)
                except:
                    skipped_lines_count += 1
                    continue

                log_line = json_object["log"]
               # Get write time
                write_time_split = log_line.split("INFO")
                write_time_string = write_time_split[0][:len(write_time_split[0]) - 2]
                log_time_in_datetime = datetime.datetime.strptime(write_time_string, '%Y-%m-%dT%H:%M:%S.%fZ')


                payload_index = log_line.index(search_string) + 1
                payload = log_line[payload_index + len(search_string) + 1:]

                # Convert Payload to a json

                payload = "event=" + payload
                # Remove timestamp at end of line
                payload = payload.rsplit(" ", 1)[0]
                payload_list = payload.split(",")

                unit_type = ""
                topic_name = ""
                metadata_field = ""

                for item in payload_list:

                    # Get topic name
                    item_split = item.split("=")
                    if "topic_name" in item_split:
                        topic_name = item_split[1].split(' ')[0]
                        continue

                    # Get unit type
                    if "unit_type" in item_split:
                        unit_type = item_split[1]
                        continue

                    if "unit_id" in item_split:
                        unit_id = item_split[1]
                        continue
                    # If topic is map_msg, get timestamp from metadata.timestamp
                    if topic_name == "v2xhub_map_msg_in":
                        if "metadata.timestamp" in item_split:
                            # Get metadata timestamp
                            message_timestamp = int(item_split[1].split(' ')[0])
                            time_in_s = message_timestamp/1000
                            payload_time_in_datetime = datetime.datetime.fromtimestamp(time_in_s)
                            payload_time_in_datetime = (payload_time_in_datetime.astimezone(pytz.utc)).replace(tzinfo=None)



                # Convert timestamp to datetime
                try:
                    # Get payload timestamp from bridge
                    if topic_name != "v2xhub_map_msg_in":
                        payload_timestamp_string = str(log_line.split(" ")[-1])[:-1]
                        payload_timestamp = float(payload_timestamp_string)
                        payload_time_in_datetime = datetime.datetime.fromtimestamp(payload_timestamp/1e6)
                        payload_time_in_datetime = (payload_time_in_datetime.astimezone(pytz.utc)).replace(tzinfo=None)

                except:
                    print("Could not get payload timestamp from topic: {}. Skipping".format(topic_name))
                    continue



                # If within test window
                if log_time_in_datetime > start_time and log_time_in_datetime < end_time :
                    delay = (log_time_in_datetime - payload_time_in_datetime).total_seconds()
                    if delay < 0.0:
                        negative_delay_row_counts += 1
                    else:
                        delay_records.append(delay)
                        delay_writer.writerow([unit_id, topic_name, payload_time_in_datetime, log_time_in_datetime, delay])

                    message_drop_writer.writerow([unit_id, topic_name, payload_time_in_datetime, log_time_in_datetime])

                    if topic_name not in unique_topics:
                            unique_topics.append(topic_name)

                    total_rows += 1

                if log_time_in_datetime > end_time:
                    break



    print("Number of unique topics: ", len(unique_topics))
    print(unique_topics)

    ## Calculate required statistics
    delay_np_array = np.array(delay_records)
    if delay_np_array.size > 1:
        delay_max = np.amax(delay_np_array)
        delay_mean = np.mean(delay_np_array)
        delay_stdev = np.std(delay_np_array)
        delay_percentile_75 = np.percentile(delay_np_array,75)
        delay_percentile_95 = np.percentile(delay_np_array,95)
        print("max: {}, mean: {}, stdev: {}, 75th Percentile: {}, 95th Percentile: {}".format(delay_max, delay_mean, delay_stdev, delay_percentile_75, delay_percentile_95))

    print("Negative row count: ", negative_delay_row_counts)
    print("Total row count: ", total_rows)


def read_log_table():
    log_csv = 'log_timesheet.csv'
    log_df = pd.read_csv(log_csv)
    log_df = log_df.dropna()
    log_df_dict = dict(tuple(log_df.groupby('Test Case')))

    return log_df_dict


def main():
    if len(sys.argv) < 2:
        print('Run with: "python3 parse_messaging_server_logs.py logname"')
    else:
        logname = sys.argv[1]
        log_timesheet_df = read_log_table()

        test_case = (logname.split("/")[-1]).split("_")[0]
        runs_string = ((logname.split("/")[-1]).split("_")[1].split(".")[0])[1:]
        runs_range_split = runs_string.split('-')
        if len(runs_range_split) == 1:
            runs_range = range(int(runs_range_split[0]),int(runs_range_split[0]) + 1)
        else:
            runs_range = range(int(runs_range_split[0]),int(runs_range_split[1]) + 1)


        test_df = log_timesheet_df[test_case]

        for index in range(0, len(test_df)):
            start_time_epoch = test_df['Start Time'].values[index]
            end_time_epoch = test_df['End Time'].values[index]



            local = pytz.timezone("America/New_York")


            run_num = test_df['Run'].values[index].split('R')[1]

            if int(run_num) in runs_range:
                print("start time epoch: " + str(start_time_epoch))
                print("end time epoch: " + str(end_time_epoch))
                print("test case: "+ test_case)
                print("runs_string: "+ runs_string)
                print(runs_range)
                print("Run num: ", run_num)
                parseInfluxfile(logname, start_time_epoch, end_time_epoch, run_num)



if __name__ == "__main__":
    main()
