# Copyright 2015 Open Source Robotics Foundation, Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import pytest
from nats.aio.client import Client as NATS
import rclpy

import rosidl_runtime_py
import json
import time
import threading
import asyncio

from nats.aio.client import Client as NATS

async def nats_connection(nc):

    async def disconnected_cb():
        print("Got disconnected...")

    async def reconnected_cb():
        print("Got reconnected...")

    await nc.connect("nats://44.206.13.7:4222", reconnected_cb=reconnected_cb, disconnected_cb=disconnected_cb, max_reconnect_attempts=1)

@pytest.mark.asyncio
async def test():

    nc = NATS()
    await nats_connection(nc)

    await nc.drain()
