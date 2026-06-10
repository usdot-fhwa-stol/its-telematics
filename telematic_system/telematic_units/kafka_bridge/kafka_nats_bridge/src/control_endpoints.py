from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from kafka_nats_bridge import KafkaNatsBridge


class ControlEndpointsService:
    """Subscribe and serve NATS request/reply control subjects."""

    def __init__(self, bridge: "KafkaNatsBridge"):
        self.bridge = bridge

    async def subscribe(self):
        """Subscribe all control endpoints after Kafka topics are discovered."""
        await self.available_topics()
        await self.check_status()
        await self.publish_topics()
        self.bridge.control_endpoints_ready = True

    async def available_topics(self):
        """Expose available Kafka topics once discovery has completed."""

        async def send_list_of_topics(msg):
            self.bridge.logger.info(
                "In send_list_of_topics: Received a request for available topics"
            )
            self.bridge.kafka_info["timestamp"] = (
                datetime.now(timezone.utc).timestamp() * 1000000
            )
            self.bridge.kafka_info["topics"] = [
                {"name": topic_name}
                for topic_name in self.bridge.kafka_topics
                if topic_name not in self.bridge.exclusion_list
            ]
            message = json.dumps(self.bridge.kafka_info).encode("utf8")

            self.bridge.logger.info(
                "In send_list_of_topics: Sending available topics message to nats: %s",
                message,
            )

            await self.bridge.publish_with_retry(msg.reply, message)

        try:
            await self.bridge.nc.subscribe(
                self.bridge.kafka_info["unit_id"] + ".available_topics",
                self.bridge.kafka_info["unit_id"],
                send_list_of_topics,
            )
        except Exception as exc:
            self.bridge.logger.error(
                "In send_list_of_topics: ERROR sending list of available topics to nats server: %s",
                exc,
            )

    async def check_status(self):
        """Expose health status without affecting forwarding state on failure."""

        async def send_status(msg):
            try:
                status_ok = await self.bridge.publish_with_retry(msg.reply, b"OK")
                if not status_ok and msg.reply:
                    await self.bridge.publish_with_retry(msg.reply, b"ERROR")
            except Exception as exc:
                self.bridge.logger.error("Status handler failed: %s", exc)
                if msg.reply:
                    await self.bridge.publish_with_retry(msg.reply, b"ERROR")

        try:
            await self.bridge.nc.subscribe(
                self.bridge.kafka_info["unit_id"] + ".check_status",
                self.bridge.kafka_info["unit_id"],
                send_status,
            )
        except Exception as exc:
            self.bridge.logger.warning("Status update failed: %s", exc)

    async def publish_topics(self):
        """Receive requested topics and update forwarding subscriptions list."""

        async def topic_request(msg):
            await self.bridge.publish_with_retry(
                msg.reply,
                b"topic publish request received!",
            )
            data = json.loads(msg.data.decode("utf-8"))
            requested_topics = data["topics"]
            self.bridge.logger.info(
                "In topic_request: Received a request to publish the following topics: %s",
                requested_topics,
            )
            self.bridge.subscribers_list = requested_topics
            self.bridge.logger.info(
                "In topic_request: UPDATED subscriber list: %s",
                self.bridge.subscribers_list,
            )

        try:
            await self.bridge.nc.subscribe(
                self.bridge.kafka_info["unit_id"] + ".publish_topics",
                "worker",
                topic_request,
            )
        except Exception as exc:
            self.bridge.logger.error("In topic_request: Error publishing: %s", exc)