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
from __future__ import annotations

import logging
from typing import List, Literal

from pydantic import computed_field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class BridgeConfig(BaseSettings):
    """
    Typed, validated configuration for the Kafka-NATS bridge.

    All values are read from environment variables.  Required fields raise a
    ``ValidationError`` at import time, eliminating silent misconfiguration that
    would otherwise surface as runtime crashes deep in the bridge logic.

    Derived values (``nats_url``, ``exclusion_list``) are computed once from the
    raw inputs via ``@computed_field`` properties and cached by Pydantic.
    """

    model_config = SettingsConfigDict(case_sensitive=False, extra="ignore")

    # ── NATS connection ─────────────────────────────────────────────────────────
    nats_server_ip_port: str
    nats_reconnect_time_wait_seconds: float = 1.0
    nats_registration_max_retries: int = 5
    nats_publish_max_retries: int = 3
    nats_publish_retry_base_delay_seconds: float = 0.2
    nats_dead_letter_max_messages: int = 100

    # ── Kafka ───────────────────────────────────────────────────────────────────
    kafka_broker_ip: str
    kafka_broker_port: str
    kafka_consumer_reset: Literal["earliest", "latest"] = "earliest"
    kafka_bridge_exclusion_list: str = ""
    kafka_max_retries: int = 5
    kafka_retry_base_delay_seconds: float = 1.0

    # ── Unit identity ───────────────────────────────────────────────────────────
    kafka_bridge_unit_id: str
    kafka_bridge_unit_type: str
    kafka_bridge_unit_name: str = "West Intersection"

    # ── Logging ─────────────────────────────────────────────────────────────────
    kafka_bridge_log_level: Literal["debug", "info", "error"] = "info"
    kafka_bridge_log_name: str = "kafka_nats_bridge"
    kafka_bridge_log_path: str = "/var/logs/"
    kafka_bridge_log_rotation_size_bytes: int = 2147483648
    kafka_bridge_log_handler_type: Literal["console", "file", "all"] = "console"

    # ── Simulation mode ─────────────────────────────────────────────────────────
    is_sim: bool = False

    # ── Derived fields ──────────────────────────────────────────────────────────

    @computed_field  # type: ignore[prop-decorator]
    @property
    def nats_url(self) -> str:
        """NATS connection URL normalised to exactly one ``nats://`` prefix."""
        endpoint = self.nats_server_ip_port.strip()
        if endpoint.startswith("nats://"):
            endpoint = endpoint[len("nats://"):]
        return "nats://" + endpoint

    @computed_field  # type: ignore[prop-decorator]
    @property
    def exclusion_list(self) -> List[str]:
        """Parsed list of Kafka topic names excluded from available-topics responses."""
        raw = self.kafka_bridge_exclusion_list or ""
        return [t.strip() for t in raw.split(",") if t.strip()]

    # ── Validators ──────────────────────────────────────────────────────────────

    @field_validator("kafka_bridge_log_path", mode="after")
    @classmethod
    def ensure_trailing_slash(cls, v: str) -> str:
        """Guarantee the log path ends with a directory separator."""
        return v if v.endswith("/") else v + "/"

    # ── Convenience property ────────────────────────────────────────────────────

    @property
    def log_level_int(self) -> int:
        """Python ``logging`` level integer for the configured log level string."""
        return {
            "debug": logging.DEBUG,
            "info": logging.INFO,
            "error": logging.ERROR,
        }[self.kafka_bridge_log_level]
