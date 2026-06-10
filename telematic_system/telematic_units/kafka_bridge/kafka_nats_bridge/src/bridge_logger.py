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

import logging
from datetime import datetime
from logging.handlers import RotatingFileHandler
from typing import TYPE_CHECKING, cast

if TYPE_CHECKING:
    from config import BridgeConfig

_FORMATTER = logging.Formatter(
    "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)


class BridgeLogger(logging.Logger):
    """
    Custom ``logging.Logger`` subclass for the Kafka-NATS bridge.

    Supports file, console, or both handler modes driven entirely by
    ``BridgeConfig``.  Use the ``create`` classmethod rather than the
    standard ``logging.getLogger`` factory so that the correct subclass and
    handlers are always returned.

    Example::

        from bridge_logger import BridgeLogger
        logger = BridgeLogger.create(config)
        logger.info("bridge started")
    """

    @classmethod
    def create(cls, config: "BridgeConfig") -> "BridgeLogger":
        """
        Build and return a fully configured ``BridgeLogger`` instance.

        The logger name is taken from ``config.kafka_bridge_log_name``.
        If a logger with that name was already created its handlers are
        cleared before new ones are attached, so the method is safe to
        call more than once (e.g. during tests).

        Handler selection:
        - ``"console"``  – ``StreamHandler`` only
        - ``"file"``     – ``RotatingFileHandler`` only
        - ``"all"``      – both handlers are attached
        """
        logging.setLoggerClass(cls)
        logger = cast(BridgeLogger, logging.getLogger(config.kafka_bridge_log_name))
        logger.__class__ = cls

        # Remove any handlers from a previous call (safe for re-use in tests).
        logger.handlers.clear()

        level = config.log_level_int
        logger.setLevel(level)

        handler_type = config.kafka_bridge_log_handler_type

        if handler_type in ("file", "all"):
            logger.addHandler(cls._make_file_handler(config, level))
        if handler_type in ("console", "all"):
            logger.addHandler(cls._make_console_handler(level))

        if handler_type not in ("file", "console", "all"):
            logger.addHandler(cls._make_console_handler(level))
            logger.warning(
                "Unknown log handler type %r – falling back to console",
                handler_type,
            )

        return logger

    @staticmethod
    def _make_console_handler(level: int) -> logging.StreamHandler:
        handler = logging.StreamHandler()
        handler.setLevel(level)
        handler.setFormatter(_FORMATTER)
        return handler

    @staticmethod
    def _make_file_handler(
        config: "BridgeConfig", level: int
    ) -> RotatingFileHandler:
        timestamp = datetime.now().strftime("_%m_%d_%Y_%H_%M_%S")
        filename = config.kafka_bridge_log_path + config.kafka_bridge_log_name + timestamp + ".log"
        handler = RotatingFileHandler(
            filename,
            maxBytes=config.kafka_bridge_log_rotation_size_bytes,
            backupCount=5,
        )
        handler.setLevel(level)
        handler.setFormatter(_FORMATTER)
        return handler
