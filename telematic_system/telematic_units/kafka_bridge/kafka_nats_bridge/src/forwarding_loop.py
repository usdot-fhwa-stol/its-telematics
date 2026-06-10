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
from __future__ import annotations

import asyncio
import json
from datetime import date, datetime, timezone
from typing import TYPE_CHECKING

from aiokafka import AIOKafkaConsumer

if TYPE_CHECKING:
    from kafka_nats_bridge import KafkaNatsBridge


class ForwardingLoopService:
    """Start Kafka consumption and run steady-state Kafka-to-NATS forwarding."""

    def __init__(self, bridge: "KafkaNatsBridge"):
        self.bridge = bridge

    async def start_kafka_consumer_with_retry(self):
        """Start Kafka consumer with bounded retries and exponential backoff."""
        attempt = 0
        while True:
            try:
                await self.bridge.start_kafka_consumer()
                return
            except Exception as exc:
                attempt += 1
                self.bridge.logger.error(
                    "Kafka consumer start failed on attempt %s: %s",
                    attempt,
                    exc,
                )
                if attempt >= self.bridge.kafka_max_retries:
                    raise RuntimeError("Kafka consumer failed after max retries") from exc
                retry_sleep = self.bridge.kafka_retry_base_delay * (2 ** (attempt - 1))
                self.bridge.logger.warning(
                    "Retrying Kafka consumer start in %s seconds",
                    retry_sleep,
                )
                await asyncio.sleep(retry_sleep)

    async def start_kafka_consumer(self):
        """Create consumer, discover topics, and subscribe before control endpoints open."""
        try:
            self.bridge.logger.info("In run_async_kafka_consumer")
            self.bridge.kafka_consumer = AIOKafkaConsumer(
                bootstrap_servers=[self.bridge.kafka_ip + ":" + self.bridge.kafka_port],
                auto_offset_reset=self.bridge.kafka_offset_reset,
                enable_auto_commit=True,
                group_id=None,
                value_deserializer=lambda raw: json.loads(raw.decode("utf-8")),
            )

            await self.bridge.kafka_consumer.start()
            self.bridge.kafka_topics = list(await self.bridge.kafka_consumer.topics())

            self.bridge.logger.info(
                "In createAsyncKafkaConsumer: All available Kafka topics = %s",
                self.bridge.kafka_topics,
            )

            self.bridge.kafka_consumer.subscribe(topics=self.bridge.kafka_topics)
            self.bridge.logger.info(
                "In createAsyncKafkaConsumer: Successfully subscribed to the following topics: %s",
                self.bridge.kafka_topics,
            )
        except Exception as exc:
            self.bridge.logger.error("No Kafka broker available: %s", exc)
            raise

    async def publish_with_retry(self, subject, payload):
        """Publish to NATS with bounded retry and failed-publish buffering."""
        for attempt in range(self.bridge.nats_publish_max_retries + 1):
            try:
                await self.bridge.nc.publish(subject, payload)
                return True
            except Exception as exc:
                if attempt >= self.bridge.nats_publish_max_retries:
                    self.bridge.failed_publish_messages.append(
                        {
                            "subject": subject,
                            "payload": payload.decode("utf-8", errors="ignore")
                            if isinstance(payload, bytes)
                            else str(payload),
                            "error": str(exc),
                        }
                    )
                    self.bridge.logger.error(
                        "NATS publish failed, message added to failed-publish buffer for subject %s: %s",
                        subject,
                        exc,
                    )
                    return False
                retry_sleep = self.bridge.nats_publish_retry_base_delay * (2 ** attempt)
                self.bridge.logger.warning(
                    "NATS publish failed for subject %s, retrying in %s seconds",
                    subject,
                    retry_sleep,
                )
                await asyncio.sleep(retry_sleep)

    async def kafka_read(self):
        """Begin steady-state message forwarding after all startup dependencies are ready."""
        self.bridge.logger.info("In kafka_read: Reading kafka traffic")

        try:
            async for consumed_msg in self.bridge.kafka_consumer:
                topic = consumed_msg.topic
                if topic in self.bridge.subscribers_list and self.bridge.registered:
                    message = self._build_forward_message(
                        topic,
                        consumed_msg.value
                    )
                    topic_name = "kafka." + self.bridge.unit_id + ".data." + topic
                    self.bridge.logger.info(
                        "In kafka_read: Publishing message: %s",
                        message,
                    )
                    await self.publish_with_retry(
                        topic_name,
                        json.dumps(message).encode("utf-8"),
                    )
        except Exception as exc:
            self.bridge.logger.error("In kafka_read: Error reading kafka traffic: %s", exc)

    def _build_forward_message(
        self,
        topic,
        payload
    ):       
        message = {
            "payload": payload,
            "unit_id": self.bridge.unit_id,
            "unit_type": self.bridge.unit_type,
            "unit_name": self.bridge.unit_name,
            "msg_type": topic,
            "event_name": self.bridge.kafka_info["event_name"],
            "testing_type": self.bridge.kafka_info["testing_type"],
            "location": self.bridge.kafka_info["location"],
            "topic_name": topic,
        }

        message["timestamp"] = self._normalize_timestamp(
            topic=topic,
            payload=message["payload"]
        )

        return message

    def _normalize_timestamp(
        self,
        topic,
        payload
    ):
        """Normalize payload timestamps to UTC epoch microseconds with fallback."""
        
        naive = datetime(int(date.today().year), 1, 1, 0, 0, 0)
        first_day_epoch = naive.replace(tzinfo=timezone.utc).timestamp() * 1000
        milli_to_micro = 1000
        minute_to_milli = 60000
        second_to_micro = 1000000
        if self.bridge.is_sim:
            return datetime.now(timezone.utc).timestamp() * second_to_micro

        timestamp = None

        if "metadata" in payload:
            timestamp = (
                int(str(payload["metadata"]["timestamp"]).lstrip("0"))
                * milli_to_micro
            )
        elif "timestamp" in payload:
            timestamp = (
                int(str(payload["timestamp"]).lstrip("0"))
                * milli_to_micro
            )
        elif topic == "modified_spat":
            time_stamp = int(payload["intersections"][0]["time_stamp"])
            moy = int(payload["intersections"][0]["moy"])
            timestamp = (
                int((moy * minute_to_milli) + time_stamp + first_day_epoch)
                * milli_to_micro
            )

        if timestamp is None or len(str(timestamp)) < 16:
            timestamp = datetime.now(timezone.utc).timestamp() * second_to_micro

        return timestamp