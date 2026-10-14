import re
import sys

from enum import Enum
import datetime
import pytz
import numpy as np

class ProcessingStatus(Enum):
    IN_PROGRESS= "IN_PROGRESS"
    COMPLETED= "COMPLETED"
    ERROR= "ERROR"


def to_utc_datetime(self, timestamp):
        return datetime.datetime.fromtimestamp(timestamp).astimezone(pytz.utc).replace(tzinfo=None)

def parse_start_end_processing_line(line, search_str):
    # Regex match to extract timestamp of the form: "log":"2024-07-23 15:43:45,821
    timestamp_match = re.search(r'"log":"(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d+)', line)
    if timestamp_match:
        timestamp_str = timestamp_match.group(1)
    else:
        print("Could not find processing time for rosbag")
        sys.exit()

    log_timestamp = datetime.datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S,%f')


    # Extract the rosbag name
    rosbag_match = re.search(fr'{search_str} (\S+\.mcap)', line)
    rosbag_name = rosbag_match.group(1) if rosbag_match else None

    return log_timestamp, rosbag_name


def parse_processing_service_logs(logfile):
    processing_started_msg_str = "Processing rosbag:"
    processing_completed_msg_str = "Completed rosbag processing for:"
    processing_status_str = "Updated mysql entry for"

    processing_times = []

    with open(logfile, 'r') as file:
        for line in file:
            if processing_started_msg_str in line:
                # Start line sample string: "log":"2024-07-23 17:38:16,055 - rosbag2_processing_service - process_rosbag - INFO - Processing rosbag: rosbag2_2024_06_06_201142_0_verification_T19_R1.mcap
                start_timestamp, rosbag_name = parse_start_end_processing_line(line, processing_started_msg_str)
                continue

            elif processing_completed_msg_str in line:
                # {"log":"2024-07-23 17:38:15,044 - rosbag2_processing_service - process_rosbag - INFO - Completed rosbag processing for: rosbag2_2024_06_06_194729_0_verification_T19_R1.mcap\n","stream":"stderr","time":"2024-07-23T17:38:15.044890288Z"}
                end_timestamp, rosbag_name = parse_start_end_processing_line(line, processing_completed_msg_str)
                processing_time_in_seconds = (end_timestamp - start_timestamp).total_seconds()
                continue

            elif processing_status_str in line:
                status_pattern = r'\b(COMPLETED|IN_PROGRESS|ERROR)\b'
                status_match = re.search(status_pattern, line)
                status = status_match.group(1) if status_match else None

                if status == ProcessingStatus.COMPLETED.value:
                    print(f"rosbag_name: {rosbag_name} processing_time: {processing_time_in_seconds} status: {status}")
                    processing_times.append(processing_time_in_seconds)


    arr = np.array(processing_times, dtype='float32')
    average_completion_time = np.mean(arr, axis=0)
    print(f'average_completion_time in seconds for {len(processing_times)} files: {average_completion_time}')





def main():
    if len(sys.argv) < 2:
        print('Run with: "python3 parse_processing_service_logs.py logname"')
    else:
        logname = sys.argv[1]

        parse_processing_service_logs(logname)


if __name__ == "__main__":
    main()