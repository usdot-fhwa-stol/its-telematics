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

from .api import Ros2NatsBridgeNode
import rclpy
import asyncio

async def spin_node(node):
    while rclpy.ok():
        if(node.nc.is_connected):
            rclpy.spin_once(node, timeout_sec=0.01)
        await asyncio.sleep(0.0001)

def main(args=None):
    rclpy.init()

    loop = asyncio.get_event_loop()

    ros2_nats_bridge = Ros2NatsBridgeNode()

    tasks = [
        loop.create_task(spin_node(ros2_nats_bridge)),
        loop.create_task(ros2_nats_bridge.nats_connect()),
        loop.create_task(ros2_nats_bridge.register_unit()),
        loop.create_task(ros2_nats_bridge.check_status()),
        loop.create_task(ros2_nats_bridge.available_topics()),
        loop.create_task(ros2_nats_bridge.publish_topics())
    ]

    loop.run_until_complete(asyncio.wait(tasks))
    loop.close()


if __name__ == '__main__':
    main()
