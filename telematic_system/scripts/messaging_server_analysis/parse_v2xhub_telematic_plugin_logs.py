import argparse
import json
import pandas as pd
import sys
import json.decoder as decoder
from enum import Enum
import datetime
import pytz
import re


class Column(Enum):
    '''
    Column The column name of the output csv file.
    '''
    UNIT_ID= "Unit Id"
    TOPIC= "Topic"
    PAYLOAD_TS= "Payload Timestamp"
    PAYLOAD_SRC= "Payload Source"
    EVENT_NAME= "Event Name"
    UNIT_TYPE= "Unit Type"

class LogKey(Enum):
    '''
    The key of telematic message in JSON format in v2xhub log file.
    The need for having these as two different enums is due to the logs this is reading from and the messaging server script reading CSV this is comparing to.
    '''
    UNIT_ID= "unit_id"
    TOPIC= "topic_name"
    PAYLOAD_TS= "timestamp"
    PAYLOAD= "payload"
    SOURCE="source"
    EVENT_NAME= "event_name"
    UNIT_TYPE= "unit_type"

class LogTimeSheet:
    ''' Read the log_timesheet.csv file to store the list of test cases and their start and end time of all runs within each test case.'''
    def __init__(self, log_timesheet_path: str) -> None:
        self.log_df = pd.read_csv(log_timesheet_path)
        self.log_df = self.log_df.dropna()
        self.log_df_dict = dict(tuple(self.log_df.groupby('Test Case')))
    
    def get_run_duration(self, test_case_name: str, target_run_num: int):       
        '''Return start and end time for a given test case and run number.''' 
        test_case_log_table = self.log_df_dict[test_case_name]
        for index, row in test_case_log_table.iterrows():
            run_num = re.sub(r"[a-z|A-Z]*", "", row['Run'])
            if int(run_num) == target_run_num:
                return (row['Start Time'], row['End Time'])
        return tuple()
    
    def to_utc_datetime(self, timestamp):
        return datetime.datetime.fromtimestamp(timestamp).astimezone(pytz.utc).replace(tzinfo=None)

class TelematicMessageConvertor:   
    """
     The `TelematicMessageConvertor` class is responsible for parsing and converting v2xhub telematic bridge log files into a CSV format.
     The CSV is then further processed by the get_message_drop.py. 
     """
          
    def __init__(self):
        self.published_msg : dict= {
                                    Column.UNIT_ID.value:[],
                                    Column.TOPIC.value:[],
                                    Column.PAYLOAD_TS.value:[],
                                    Column.PAYLOAD_SRC.value:[],
                                    Column.EVENT_NAME.value:[],
                                    Column.UNIT_TYPE.value:[]
                                }   

    def convert_to_json(self, msg: str):
        try:
            msg_json = json.loads(msg)
            return msg_json
        except (decoder.JSONDecodeError , TypeError) as e:
            return sys.exit("Could not decode JSON message " + str(e))
        
    def to_csv(self, data: pd.DataFrame, output_path: str):
        data.to_csv(output_path, index=False, date_format='%Y-%m-%d %H:%M:%S.%f')

    def get_filter_published_msg_frame(self, start_time_utc, end_time_utc):
        listmsg = []
        published_msg_frame = pd.DataFrame.from_dict(self.published_msg)
        for index, row in published_msg_frame.iterrows():
            if row['Payload Timestamp']>=start_time_utc and row['Payload Timestamp']<= end_time_utc:
                listmsg.append(row)
        filtered_published_msg=pd.DataFrame(listmsg)
        return filtered_published_msg
        

    def append_published_msg(self, msg_json: dict):
        '''Append the msg in JSON format as a row in the published msg dictionary.'''
        self.published_msg[Column.EVENT_NAME.value].append(msg_json[LogKey.EVENT_NAME.value])        
        payload_time_str = str(msg_json[LogKey.PAYLOAD_TS.value])
        payload_timestamp_utc = self.convert_timestamp(payload_time_str)
        self.published_msg[Column.PAYLOAD_TS.value].append(payload_timestamp_utc)
        self.published_msg[Column.TOPIC.value].append(msg_json[LogKey.TOPIC.value])
        self.published_msg[Column.PAYLOAD_SRC.value].append(msg_json[LogKey.PAYLOAD.value][LogKey.SOURCE.value])
        self.published_msg[Column.UNIT_ID.value].append(msg_json[LogKey.UNIT_ID.value])
        self.published_msg[Column.UNIT_TYPE.value].append(msg_json[LogKey.UNIT_TYPE.value])

    def convert_timestamp(self, timestamp_str: str):
        payload_timestamp = float(timestamp_str)
        time_in_s = payload_timestamp/1e6
        time_in_s = float("{:.6f}".format(time_in_s))
        payload_timestamp_utc = self.to_utc_datetime(time_in_s)
        return payload_timestamp_utc

    def to_utc_datetime(self, timestamp):
        '''Convert timestamp to datetime and UTC timezone.'''
        return datetime.datetime.fromtimestamp(timestamp).astimezone(pytz.utc).replace(tzinfo=None)

    def split_lines(self, chunk: str):
        lines = chunk.split('\n')
        remaining_part = lines.pop(-1)
        return (lines, remaining_part)

    def is_published_msg(self, line: str)->bool:
        return 'Published:' in line and 'TelematicUnit'  in line
   
    def extract_published_msg(self, line: str)->str:
        msg_idx = line.find("Published:")
        msg_end_idx = line.find('n","stream"')
        published_msg = line[msg_idx+10:msg_end_idx].strip()
        published_msg = published_msg.replace('\\','')
        return published_msg
            
    def parse_log_file(self, log_file_path: str):
        remaining_part = ''
        try:
            with open(log_file_path, "r", encoding='utf-8') as file:
                while True:
                    chunk = file.read(1024)
                    if not chunk:
                        break
                    lines = remaining_part + chunk
                    completed_lines, remaining_part = self.split_lines(lines)
                    for line in completed_lines:
                        # Process each line with topic and generated from TelematicUnit file
                        if not self.is_published_msg(line):
                            continue
                        msg = self.extract_published_msg(line)
                        msg_json = self.convert_to_json(msg)
                        if msg_json is None:
                            continue
                        self.append_published_msg(msg_json)
        except FileNotFoundError as e:
            sys.exit("Could not find file " + str(e))

    def get_test_case_run_nums(self, file_path: str):
        '''Get the test case and run numbers for each test case given the filepath.'''
        test_case = (file_path.split("/")[-1]).split("_")[0]
        runs_string = ((file_path.split("/")[-1]).split("_")[1].split(".")[0])[1:]
        runs_range_split = runs_string.split('-')
        if len(runs_range_split) == 1:
            runs_range = range(int(runs_range_split[0]),int(runs_range_split[0]) + 1)
        else:
            runs_range = range(int(runs_range_split[0]),int(runs_range_split[1]) + 1)
        return test_case, runs_range

if __name__ == "__main__":
    parser = argparse.ArgumentParser(prog="v2xhub_telematic_bridge_log_parser",
                                     description="Parse v2xhub telematic bridge log file")
    parser.add_argument("--log_file_path", required=True, help="Path to v2xhub telematic bridge log file")
    args = parser.parse_args()
    print("Parsing "+ args.log_file_path+" ...")
    converter = TelematicMessageConvertor()
    converter.parse_log_file(args.log_file_path)
    test_case, target_run_range = converter.get_test_case_run_nums(args.log_file_path)

    log_timesheet=LogTimeSheet("log_timesheet.csv")

    for target_run_num in target_run_range:
        start_time, end_time = log_timesheet.get_run_duration(test_case, target_run_num)
        start_time_utc = log_timesheet.to_utc_datetime(start_time)
        end_time_utc = log_timesheet.to_utc_datetime(end_time)
        print("\n>>> Searching Test case: "+ test_case + ", run number: " + str(target_run_num)+ ", start time: " + str(start_time_utc) + ", end time: " + str(end_time_utc))
        filter_published_msg_frame = converter.get_filter_published_msg_frame(start_time_utc, end_time_utc)
        print(filter_published_msg_frame)
        if not filter_published_msg_frame.empty:
            converter.to_csv(filter_published_msg_frame, args.log_file_path.split("/")[-1]+"_"+ str(target_run_num)+"_parsed.csv")

