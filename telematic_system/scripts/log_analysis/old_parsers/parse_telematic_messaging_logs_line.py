import csv
import json
import sys
from datetime import datetime, tzinfo
from dateutil import tz
import pytz


def parseInfluxfile(logname):
    fileName = logname.split(".")[0]
    influx_log = open(logname, 'r')

    results_file = open(f'{fileName}_parsed.csv', 'w')
    writer = csv.writer(results_file)
    writer.writerow(["Topic", "Message Time", "Log_Timestamp(s)", "Delay(s)"])
    topic_name = ""
    time_in_s = 0
    sec = 0
    nanosec = 0
    skipped_lines_count = 0
    unique_topics = []

    for line in influx_log:
        if "ERROR" in line or "failure writing points to database" in line or "INFO" not in line:
            continue
        split_line = line.split("INFO")

        # Log Timestamp UTC
        if len(split_line[0].strip()) == 0:
            continue
        write_time_datetime_utc = datetime.strptime(
            split_line[0].strip(), '%Y-%m-%d %H:%M:%S.%f')
        write_time_datetime_utc = write_time_datetime_utc.replace(
            tzinfo=pytz.UTC)
        local_zone = tz.tzlocal()

        # Convert timezone of log datetime from UTC to local
        write_time_datetime_local = write_time_datetime_utc.astimezone(
            local_zone)
        write_timestamp_local = int(write_time_datetime_local.timestamp()*1000)

        # Log message content
        split_line_msg = line.split("Sending to influxdb:")
        if split_line_msg.__len__() < 2:
            continue
        split_line_msg = split_line_msg[1].strip()
        msg_timestamp_in_milli = int(
            int(split_line_msg.split(" ")[2].strip())/1000)
        metadata_list = split_line_msg.split(" ")[0].split(",")
        for metadata in metadata_list:
            if "topic_name" in metadata:
                topic_name = metadata.split("=")[1]
                if topic_name not in unique_topics:
                        unique_topics.append(topic_name)

        delay = (write_timestamp_local - msg_timestamp_in_milli)/1000
        writer.writerow([topic_name,str(datetime.fromtimestamp(msg_timestamp_in_milli/1000.0)) , write_time_datetime_local, delay])

    print("Number of unique topics: ", len(unique_topics))
    print(unique_topics)


def main():
    if len(sys.argv) < 2:
        print('Run with: "python3 parse_telematic_messaging_logs_line.py logname"')
    else:
        logname = sys.argv[1]
        parseInfluxfile(logname)


if __name__ == "__main__":
    main()
