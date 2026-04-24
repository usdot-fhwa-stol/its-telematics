#
# Copyright (C) 2022 LEIDOS.
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
def main():

    #Create KafkaNatsBridge object and asyncio loop
    kafka_nats_bridge = KafkaNatsBridge()
    loop = asyncio.get_event_loop()

    #Create individual asyncio tasks to connect to the NATS server, register the KafkaNatsBridge
    #object, listen for requests for sending available topics/publishing specific topics, and publish
    #carma streets data that has been subscribed to
    tasks = [
        loop.create_task(kafka_nats_bridge.run_async_kafka_consumer()),# Kafka consumer was created, subscribe to all available carma-streets kafka topics, and wait to read data from kafka topics
        loop.create_task(kafka_nats_bridge.nats_connect()),
        loop.create_task(kafka_nats_bridge.register_unit()),
        loop.create_task(kafka_nats_bridge.check_status()),
        loop.create_task(kafka_nats_bridge.available_topics()),
        loop.create_task(kafka_nats_bridge.publish_topics())
    ]

    #Run asyncio until tasks are complete
    loop.run_forever()
    loop.run_until_complete(asyncio.wait(tasks))
    loop.close()

if __name__ == '__main__':
    main()
