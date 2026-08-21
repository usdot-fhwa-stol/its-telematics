#
# Copyright (C) 2024 LEIDOS.
#
# Licensed under the Apache License, Version 2.0 (the "License"); you may not
# use this file except in compliance with the License. You may obtain a copy of
# the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
# WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
# License for the specific language governing permissions and limitations under
# the License.
#
import os
import logging
from logging.handlers import RotatingFileHandler
from datetime import datetime
from enum import Enum
import mysql.connector

class LogType(Enum):
    FILE = "file"
    CONSOLE = "console"
    ALL = "all"

class ProcessingStatus(Enum):
    UNKNOWN = "UNKNOWN"
    IN_PROGRESS =  "IN_PROGRESS"
    ERROR = "ERROR"
    COMPLETED = "COMPLETED"

class Config:
    def __init__(self):

        # Load environment variables
        self.load_env_variables()
        # Create logger
        self.logger = logging.getLogger(self.log_name)
        if not self.logger.hasHandlers():
            self.set_logger()

    def load_env_variables(self):
        # Configured directory to read rosbags from
        self.upload_destination_path = os.getenv("HPS_UPLOAD_DESTINATION_PATH")

        # NATS params
        self.nats_ip_port = os.getenv("HPS_NATS_SERVER_IP_PORT")
        # Nats request topic
        self.nats_request_topic = os.getenv("HPS_FILE_PROCESSING_SUBJECT")

        # Load Influx params
        self.influx_bucket = os.getenv("HPS_INFLUX_BUCKET")
        self.influx_org = os.getenv("HPS_INFLUX_ORG")
        self.influx_token = os.getenv("HPS_INFLUX_TOKEN")
        self.influx_url = (
            os.getenv("HPS_INFLUX_IP") + ":" + os.getenv("HPS_INFLUX_PORT")
        )

        # Fields in the ros message to force to string type.
        self.to_str_fields = os.getenv("HPS_TO_STR_FIELDS")
        # Fields in the ros message to ignore
        self.ignore_fields = os.getenv("HPS_IGNORE_FIELDS")
        # List of topics to be excluded from reading
        self.topic_exclusion_list = os.getenv("HPS_TOPIC_EXCLUSION_LIST")

        self.accepted_file_extensions = os.getenv("HPS_ACCEPTED_FILE_EXTENSIONS")

        # Logging configuration parameters
        self.log_level = os.getenv("HPS_LOG_LEVEL")
        self.log_name = os.getenv("HPS_LOG_NAME")
        self.log_path = os.getenv("HPS_LOG_PATH")
        self.log_rotation = int(os.getenv("HPS_LOG_ROTATION_SIZE_BYTES"))
        self.log_handler_type = os.getenv("HPS_LOG_HANDLER_TYPE")

        # Mysql parameters
        self.mysql_host = os.getenv("HPS_MYSQL_HOST")
        self.mysql_port = int(os.getenv("HPS_MYSQL_PORT"))
        self.mysql_db = os.getenv("HPS_MYSQL_DB")
        self.mysql_user = os.getenv("HPS_MYSQL_USER")
        self.mysql_password = os.getenv("HPS_MYSQL_PASSWORD")

    def set_logger(self):
        # Create logger
        if self.log_handler_type == LogType.ALL.value:
            # If all create log handler for both file and console
            self.createLogger(LogType.FILE.value)
            self.createLogger(LogType.CONSOLE.value)
        elif self.log_handler_type == LogType.FILE.value or self.log_handler_type == LogType.CONSOLE.value:
            self.createLogger(self.log_handler_type)
        else:
            self.createLogger(LogType.CONSOLE.value)
            self.logger.warn("Incorrect Log type defined, defaulting to console")

    def createLogger(self, log_type):
        """Creates log file for the ServiceManager with configuration items based on the settings input in the params.yaml file"""
        # create log file and set log levels

        now = datetime.now()
        dt_string = now.strftime("_%m_%d_%Y_%H_%M_%S")
        log_name = self.log_name + dt_string + ".log"
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(funcName)s - %(levelname)s - %(message)s')

        # Create a rotating log handler that will rotate after maxBytes rotation, that can be configured in the
        # params yaml file. The backup count is how many rotating logs will be created after reaching the maxBytes size
        if log_type == LogType.FILE.value:
            log_handler = RotatingFileHandler(
                self.log_path+log_name, maxBytes=self.log_rotation, backupCount=5)
        else:
            log_handler = logging.StreamHandler()
        log_handler.setFormatter(formatter)

        if(self.log_level == "debug"):
            self.logger.setLevel(logging.DEBUG)
        elif(self.log_level == "info"):
            self.logger.setLevel(logging.INFO)
        elif(self.log_level == "error"):
            self.logger.setLevel(logging.ERROR)

        self.logger.addHandler(log_handler)
