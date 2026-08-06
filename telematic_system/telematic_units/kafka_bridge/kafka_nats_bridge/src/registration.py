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
from typing import TYPE_CHECKING
from nats.errors import (
    ConnectionClosedError,
    NoRespondersError,
    NoServersError,
    TimeoutError,
)

if TYPE_CHECKING:
    from kafka_nats_bridge import KafkaNatsBridge


class RegistrationService:
    """Handle unit registration lifecycle after NATS connectivity is established."""

    def __init__(self, bridge: KafkaNatsBridge):
        self.bridge = bridge

    async def register_unit_with_retry(self):
        """Register unit with bounded retries and exponential backoff."""
        max_retries = self.bridge.nats_registration_max_retries
        attempt = 0
        while max_retries < 0 or attempt < max_retries:
            attempt += 1
            if await self.register_unit():
                return True
            retry_sleep = self.bridge.kafka_retry_base_delay * (2 ** (attempt - 1))
            self.bridge.logger.warning(
                "Register unit failed, retrying in %s seconds",
                retry_sleep,
            )
            await asyncio.sleep(retry_sleep)
        raise RuntimeError("Unable to register unit after retries")

    async def register_unit(self):
        """Send register_unit request and populate event metadata on success."""
        self.bridge.logger.info("Entering register unit")
        kafka_info_message = json.dumps(
            self.bridge.kafka_info,
            ensure_ascii=False,
        ).encode("utf8")

        if not self.bridge.registered:
            try:
                response = await self.bridge.nc.request(
                    self.bridge.kafka_info["unit_id"] + ".register_unit",
                    kafka_info_message,
                    timeout=5,
                )
                message = response.data.decode("utf-8")
                self.bridge.logger.warning(
                    "Registering unit received response: %s",
                    message,
                )
                message_json = json.loads(message)
                self.bridge.kafka_info["event_name"] = message_json["event_name"]
                self.bridge.kafka_info["location"] = message_json["location"]
                self.bridge.kafka_info["testing_type"] = message_json["testing_type"]
                self.bridge.registered = True
                return True
            except (
                asyncio.TimeoutError,
                KeyError,
                ValueError,
                ConnectionClosedError,
                NoRespondersError,
                TimeoutError,
                NoServersError,
            ) as exc:
                self.bridge.logger.warning("Registering unit failed: %s", exc)
                self.bridge.registered = False
                return False
        return True