#
# Copyright (C) 2026 LEIDOS.
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
from kafka_nats_bridge import KafkaNatsBridge
import asyncio


#This creates a carma streets to nats server bridge. It will initiate communication with the
#carma-streets kafka broker and the telematic cloud nats server. Users can subscribe to carma streets
#topics from the telematics UI, which will be streamed to the nats server.
async def startup_bridge():
    kafka_nats_bridge = KafkaNatsBridge()
    await kafka_nats_bridge.run()


def main():
    asyncio.run(startup_bridge())

if __name__ == '__main__':
    main()
