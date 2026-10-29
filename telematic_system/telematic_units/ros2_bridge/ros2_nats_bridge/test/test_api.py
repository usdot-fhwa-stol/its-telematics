#
# Copyright (C) 2022-2026 LEIDOS.
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

import asyncio
import json
from unittest.mock import AsyncMock, MagicMock

import pytest
import rclpy
from builtin_interfaces.msg import Time
from std_msgs.msg import Header, String

from ros2_nats_bridge import main as bridge_main
from ros2_nats_bridge.api import Ros2NatsBridgeNode


@pytest.fixture
def node(monkeypatch, tmp_path):
    monkeypatch.setenv("ROS2_BRIDGE_UNIT_ID", "unit")
    monkeypatch.setenv("ROS2_BRIDGE_LOG_LEVEL", "info")
    monkeypatch.setenv("ROS2_BRIDGE_LOG_NAME", "test")
    monkeypatch.setenv("ROS2_BRIDGE_LOG_PATH", str(tmp_path) + "/")
    monkeypatch.setenv("ROS2_BRIDGE_LOG_ROTATION_SIZE_BYTES", "1048576")
    monkeypatch.setenv("ROS2_BRIDGE_LOG_HANDLER_TYPE", "all")
    monkeypatch.setenv("ROS2_TOPIC_EXCLUSION_LIST", "/rosout")

    rclpy.init()
    node = Ros2NatsBridgeNode()
    node.nc = AsyncMock()
    node.vehicle_info.update({"event_name": "event", "location": "lab", "testing_type": "test"})
    node.get_topic_names_and_types = MagicMock(return_value=[
        ("/test_topic", ["std_msgs/msg/String"]),
        ("/rosout", ["std_msgs/msg/String"]),
    ])
    yield node
    node.logger.handlers.clear()
    node.destroy_node()
    rclpy.shutdown()


def nats_msg(data):
    return MagicMock(subject="subject", reply="reply", data=json.dumps(data).encode())


def subscribe_callback(node):
    """Return the callback the node passed to the last subscribe call"""
    return node.nc.subscribe.call_args.args[2]


def test_init(node):
    assert node.exclusion_list == ["/rosout"]
    assert len(node.logger.handlers) == 2


def test_nats_connect(node):
    asyncio.run(node.nats_connect())
    node.nc.connect.assert_awaited_once()


def test_register_unit(node):
    node.vehicle_info = {"unit_id": "unit"}
    node.nc.request.return_value = MagicMock(
        data=json.dumps({"event_name": "event", "location": "lab", "testing_type": "test"}).encode())

    asyncio.run(node.register_unit())

    assert node.registered
    assert node.vehicle_info["event_name"] == "event"


def test_register_unit_failure(node):
    node.nc.request.side_effect = asyncio.TimeoutError()
    asyncio.run(node.register_unit())
    assert not node.registered


def test_check_status(node):
    asyncio.run(node.check_status())
    asyncio.run(subscribe_callback(node)(nats_msg({})))
    node.nc.publish.assert_awaited_once_with("reply", b"OK")


def test_available_topics_skips_excluded(node):
    asyncio.run(node.available_topics())
    asyncio.run(subscribe_callback(node)(nats_msg({})))

    message = json.loads(node.nc.publish.call_args.args[1])
    assert message["topics"] == [{"name": "/test_topic", "type": "std_msgs/msg/String"}]


def test_publish_topics_subscribe_and_unsubscribe(node):
    asyncio.run(node.publish_topics())
    topic_request = subscribe_callback(node)

    asyncio.run(topic_request(nats_msg({"topics": ["/test_topic"]})))
    assert list(node.subscribers_list) == ["/test_topic"]

    asyncio.run(topic_request(nats_msg({"topics": []})))
    assert node.subscribers_list == {}


def test_callback_uses_ros_timestamp(node):
    callback = node.CallBack("std_msgs/msg/Header", "/header", node.nc, "unit", "type", "name",
                             "event", "test", "lab", False, node.logger)

    asyncio.run(callback.listener_callback(Header(stamp=Time(sec=1700000000, nanosec=500000000))))

    subject, message = node.nc.publish.call_args.args
    assert subject == "platform.unit.data.header"
    assert json.loads(message)["timestamp"] == pytest.approx(1700000000500000)


def test_callback_without_timestamp_uses_bridge_time(node):
    callback = node.CallBack("std_msgs/msg/String", "/test_topic", node.nc, "unit", "type", "name",
                             "event", "test", "lab", False, node.logger)

    asyncio.run(callback.listener_callback(String(data="hello")))

    message = json.loads(node.nc.publish.call_args.args[1])
    assert message["payload"] == {"data": "hello"}
    assert message["timestamp"] > 1700000000000000


def test_main_runs_bridge_tasks(monkeypatch):
    node = AsyncMock()
    monkeypatch.setattr(bridge_main, "Ros2NatsBridgeNode", MagicMock(return_value=node))
    monkeypatch.setattr(bridge_main.rclpy, "init", MagicMock())
    monkeypatch.setattr(bridge_main.rclpy, "ok", MagicMock(side_effect=[True, False]))
    monkeypatch.setattr(bridge_main.rclpy, "spin_once", MagicMock())
    asyncio.set_event_loop(asyncio.new_event_loop())

    bridge_main.main()

    node.nats_connect.assert_awaited_once()
    node.publish_topics.assert_awaited_once()
