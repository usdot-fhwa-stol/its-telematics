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
from nats.aio.client import Client as NATS
from enum import Enum
from collections import deque
from config import BridgeConfig
from bridge_logger import BridgeLogger
from control_endpoints import ControlEndpointsService
from forwarding_loop import ForwardingLoopService
from registration import RegistrationService


class EventKeys(Enum):
    EVENT_NAME = "event_name"
    TESTING_TYPE = "testing_type"
    LOCATION = "location"


class UnitKeys(Enum):
    UNIT_ID = "unit_id"
    UNIT_TYPE = "unit_type"
    UNIT_NAME = "unit_name"


class TopicKeys(Enum):
    TOPIC_NAME = "topic_name"
    MSG_TYPE = "msg_type"

class KafkaNatsBridge():
    """
    The KafkaNatsBridge is capable of consuming Kafka topics from carma-streets and streaming
    the data in real-time to a remote NATS server. Various asynchronous functions are defined to
    enable connecting to the NATS server, publishing available topics, and streaming data of interest.
    """

    # Creates a Kafka-NATS bridge object that connects to the NATS server
    def __init__(self, config=None):

        if config is None:
            config = BridgeConfig()
        self.config = config

        # NATS settings
        self.nats_url = config.nats_url
        self.nats_reconnect_wait = config.nats_reconnect_time_wait_seconds
        self.nats_max_reconnect_attempts = config.nats_max_reconnect_attempts
        self.nats_registration_max_retries = config.nats_registration_max_retries
        self.nats_publish_max_retries = config.nats_publish_max_retries
        self.nats_publish_retry_base_delay = config.nats_publish_retry_base_delay_seconds

        # Kafka settings
        self.kafka_ip = config.kafka_broker_ip
        self.kafka_port = config.kafka_broker_port
        self.kafka_offset_reset = config.kafka_consumer_reset
        self.kafka_max_retries = config.kafka_max_retries
        self.kafka_retry_base_delay = config.kafka_retry_base_delay_seconds

        # Unit identity
        self.unit_id = config.kafka_bridge_unit_id
        self.unit_type = config.kafka_bridge_unit_type
        self.unit_name = config.kafka_bridge_unit_name

        # Derived / operational settings
        self.is_sim = config.is_sim
        self.exclusion_list = config.exclusion_list

        # Runtime state
        self.nc = NATS()
        self.kafka_consumer = None
        self.kafka_topics = []  # list of available kafka topics
        self.subscribers_list = []  # list of topics the user has requested to publish
        self.registered = False
        self.control_endpoints_ready = False
        self.failed_publish_messages = deque(
            maxlen=config.nats_failed_publish_buffer_max_messages
        )
        self.registration_service = RegistrationService(self)
        self.control_endpoints_service = ControlEndpointsService(self)
        self.forwarding_loop_service = ForwardingLoopService(self)

        self.kafka_info = {
            UnitKeys.UNIT_ID.value: self.unit_id,
            UnitKeys.UNIT_TYPE.value: self.unit_type,
            UnitKeys.UNIT_NAME.value: self.unit_name,
        }

        self.logger: BridgeLogger = BridgeLogger.create(config)

        self.logger.info("Resolved NATS URL: %s", self.nats_url)
        self.logger.info("Exclusion list: %s", self.exclusion_list)
        self.logger.info(" Created Kafka-NATS bridge object")

    async def run(self):
        """Run bridge startup in deterministic order and then start forwarding loop."""
        await self.nats_connect()
        await self.register_unit_with_retry()
        await self.start_kafka_consumer_with_retry()
        await self.subscribe_control_endpoints()
        await self.kafka_read()

    async def run_async_kafka_consumer(self):
        """Backward-compatible method retained for existing call sites."""
        await self.start_kafka_consumer_with_retry()
        await self.kafka_read()

    async def start_kafka_consumer_with_retry(self):
        """Delegate Kafka startup retry behavior to forwarding loop module."""
        return await self.forwarding_loop_service.start_kafka_consumer_with_retry()

    async def start_kafka_consumer(self):
        """Delegate Kafka consumer creation to forwarding loop module."""
        return await self.forwarding_loop_service.start_kafka_consumer()

    async def publish_with_retry(self, subject, payload):
        """Delegate NATS publish retry behavior to forwarding loop module."""
        return await self.forwarding_loop_service.publish_with_retry(subject, payload)

    async def kafka_read(self):
        """Delegate steady-state forwarding loop to forwarding loop module."""
        return await self.forwarding_loop_service.kafka_read()

    async def nats_connect(self):
        """
            Attempt to connect to the NATS server with logging callbacks, The IP address and port of the
            NATS server are configurable items in docker-compose.units.yml. For a remote NATS server on the AWS EC2 instance,
            the public ipv4 address of the EC2 instance should be used.
        """
        self.logger.info(" In nats_connect: Attempting to connect to nats server at: " + str(self.nats_url))

        async def disconnected_cb():
            self.logger.info(
                " In nats_connect: Got disconnected from nats server...")
            self.registered = False

        async def reconnected_cb():
            self.logger.info(
                " In nats_connect: Got reconnected from nats server...")
            self.registered = False
            await self.recover_after_nats_reconnect()

        async def error_cb(err):
            self.logger.error(
                " In nats_connect: Error with nats server: {0}".format(err))

        try:
            await self.nc.connect(self.nats_url,
                                  error_cb=error_cb,
                                  reconnected_cb=reconnected_cb,
                                  disconnected_cb=disconnected_cb,
                                  max_reconnect_attempts=self.nats_max_reconnect_attempts,
                                  reconnect_time_wait=self.nats_reconnect_wait)
            self.logger.info(" In nats_connect: Connected to nats server!")
        except Exception as exc:
            self.logger.error(" In nats_connect: Error connecting to nats server: " + str(exc))
            raise
        finally:
            self.logger.info(" In nats_connect: Done nats connection call.")

    async def recover_after_nats_reconnect(self):
        """Re-register and restore endpoint subscriptions after reconnect."""
        try:
            await self.register_unit_with_retry()
            await self.subscribe_control_endpoints()
        except Exception as exc:
            self.logger.error("Failed reconnect recovery sequence: " + str(exc))

    async def register_unit_with_retry(self):
        """Delegate registration retry behavior to registration module."""
        return await self.registration_service.register_unit_with_retry()

    async def subscribe_control_endpoints(self):
        """Delegate control endpoint subscription to control endpoints module."""
        return await self.control_endpoints_service.subscribe()

    async def available_topics(self):
        """Delegate available_topics subscription to control endpoints module."""
        return await self.control_endpoints_service.available_topics()

    async def register_unit(self):
        """Delegate register_unit handshake to registration module."""
        return await self.registration_service.register_unit()

    async def check_status(self):
        """Delegate check_status subscription to control endpoints module."""
        return await self.control_endpoints_service.check_status()

    async def publish_topics(self):
        """Delegate publish_topics subscription to control endpoints module."""
        return await self.control_endpoints_service.publish_topics()
