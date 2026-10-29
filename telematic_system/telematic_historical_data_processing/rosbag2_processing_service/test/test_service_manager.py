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


import pytest
import json
import datetime
import os
import tempfile
import asyncio

from unittest import TestCase
from unittest.mock import patch, MagicMock, AsyncMock, Mock
from nats.aio.client import Client as NATS
from influxdb_client import InfluxDBClient
from aiounittest import AsyncTestCase

from rosbag2_processing_service.config import Config
from rosbag2_processing_service.config import ProcessingStatus
from rosbag2_processing_service.service_manager import ServiceManager
from rosbag2_processing_service.rosbag_processor import Rosbag2Parser
import rosbag2_processing_service.main

from nats.aio.client import Client
import mysql

pytest_plugins = ('pytest_asyncio')


class ServiceManagerTestClass(AsyncTestCase):

    def test_config(self):
        # Load default variables from pytest.ini
        config1 = Config()
        assert config1.log_handler_type == "console"

        os.environ["HPS_LOG_HANDLER_TYPE"] = "file"
        config2 = Config()
        assert config2.log_handler_type == "file"

        os.environ["HPS_LOG_HANDLER_TYPE"] = "all"
        config2 = Config()
        config2.set_logger()
        assert config2.log_handler_type == "all"

        os.environ["HPS_LOG_HANDLER_TYPE"] = "incorrect_type"
        config3 = Config()
        # Should default to console without exception
        try:
            config3 = Config()
            config3.set_logger()
        except Exception as e:
            pytest.fail(f"Unexpected exception raised: {e}")

        # Reset environment var
        os.environ["HPS_LOG_HANDLER_TYPE"] = "console"

        # Test config log levels
        os.environ["HPS_LOG_LEVEL"] = "info"
        config4 = Config()
        assert config4.log_level == "info"

        os.environ["HPS_LOG_LEVEL"] = "error"
        config5 = Config()
        assert config5.log_level == "error"

        # Revert log level to debug
        os.environ["HPS_LOG_LEVEL"] = "debug"

    @pytest.mark.asyncio
    async def test_nats_callback(self):
        config = Config()
        service_manager = ServiceManager(config)

        # Mock NATS message
        class MockMessage:
            def __init__(self, data):
                self.data = data.encode()

        mock_message = MockMessage(json.dumps({"filepath": "test/rosbag2.mcap"}))

        await service_manager.get_file_path_from_nats(mock_message)

        assert len(service_manager.rosbag_queue) > 0

    @pytest.mark.asyncio
    async def test_rosbag_queue_add(self):
        config = Config()
        service_manager = ServiceManager(config)

        service_manager.rosbag_queue.append("rosbag_file.txt")
        with pytest.raises(Exception):
            await service_manager.process_rosbag_queue()

    @pytest.mark.asyncio
    async def test_nats_connect(self):
        mock_nats_client = Mock(spec=Client)

        config = Config()
        service_manager = ServiceManager(config)
        service_manager.nc = mock_nats_client

        # Test establishing nats connection with mock client. Exception expected
        await service_manager.nats_connect()

    def test_update_mysql_entry(self):
        config = Config()
        service_manager = ServiceManager(config)
        service_manager.mysql_conn = MagicMock()
        try:
            service_manager.update_mysql_entry("file.mcap","ERROR","Error in processing")
        except:
            assert False

    @pytest.mark.asyncio
    async def test_new(self):

        def args_based_return(*args, **kwargs):
            # Status IN_PROGRESS returns successfully, the next call to update returns an exception. Required to break out of infinite loop while testing
            if args == ("test_rosbag.mcap", str(ProcessingStatus.IN_PROGRESS.value)):
                return
            else:
                return Exception ("exception occurred")

        config = Config()
        mysql.connector.connect = MagicMock(return_value=MagicMock())
        service_manager = ServiceManager(config)

        service_manager.update_mysql_entry = MagicMock(side_effect=args_based_return)

        with pytest.raises(Exception):
            service_manager.rosbag_queue.append("test_rosbag.txt")
            await service_manager.process_rosbag_queue()
