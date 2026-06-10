import asyncio
import logging
import logging.handlers
import sys
import types
from pathlib import Path
from types import SimpleNamespace

import pytest

aiokafka_stub = types.ModuleType("aiokafka")
aiokafka_stub.AIOKafkaConsumer = object
sys.modules.setdefault("aiokafka", aiokafka_stub)

sys.path.insert(1, str(Path(__file__).resolve().parents[1] / "src"))

from config import BridgeConfig
from bridge_logger import BridgeLogger
from kafka_nats_bridge import KafkaNatsBridge


@pytest.fixture
def bridge_env(monkeypatch):
    monkeypatch.setenv("NATS_SERVER_IP_PORT", "127.0.0.1:4222")
    monkeypatch.setenv("KAFKA_BROKER_IP", "127.0.0.1")
    monkeypatch.setenv("KAFKA_BROKER_PORT", "9092")
    monkeypatch.setenv("KAFKA_BRIDGE_UNIT_ID", "kafka_id")
    monkeypatch.setenv("KAFKA_BRIDGE_UNIT_TYPE", "infrastructure")
    monkeypatch.setenv("KAFKA_BRIDGE_LOG_LEVEL", "info")
    monkeypatch.setenv("KAFKA_BRIDGE_LOG_NAME", "kafka_nats_bridge_test")
    monkeypatch.setenv("KAFKA_BRIDGE_LOG_PATH", "/tmp/")
    monkeypatch.setenv("KAFKA_BRIDGE_LOG_ROTATION_SIZE_BYTES", "1024")
    monkeypatch.setenv("KAFKA_BRIDGE_LOG_HANDLER_TYPE", "console")
    monkeypatch.setenv("KAFKA_CONSUMER_RESET", "earliest")


def test_startup_sequence_is_ordered(bridge_env, monkeypatch):
    bridge = KafkaNatsBridge()
    order = []

    async def _nats_connect():
        order.append("nats_connect")

    async def _register_unit_with_retry():
        order.append("register_unit")

    async def _start_kafka_consumer_with_retry():
        order.append("kafka_consumer")

    async def _subscribe_control_endpoints():
        order.append("control_endpoints")

    async def _kafka_read():
        order.append("kafka_read")

    monkeypatch.setattr(bridge, "nats_connect", _nats_connect)
    monkeypatch.setattr(bridge, "register_unit_with_retry", _register_unit_with_retry)
    monkeypatch.setattr(bridge, "start_kafka_consumer_with_retry", _start_kafka_consumer_with_retry)
    monkeypatch.setattr(bridge, "subscribe_control_endpoints", _subscribe_control_endpoints)
    monkeypatch.setattr(bridge, "kafka_read", _kafka_read)

    asyncio.run(bridge.run())

    assert order == [
        "nats_connect",
        "register_unit",
        "kafka_consumer",
        "control_endpoints",
        "kafka_read",

    ]


def test_nats_url_normalization_and_exclusion_default(bridge_env, monkeypatch):
    monkeypatch.setenv("NATS_SERVER_IP_PORT", "nats://10.0.0.2:4222")
    monkeypatch.delenv("KAFKA_BRIDGE_EXCLUSION_LIST", raising=False)

    bridge = KafkaNatsBridge()

    assert bridge.nats_url == "nats://10.0.0.2:4222"
    assert bridge.exclusion_list == []


# ── BridgeConfig unit tests ────────────────────────────────────────────────────

@pytest.fixture
def min_env(monkeypatch):
    """Minimal environment satisfying all required BridgeConfig fields."""
    monkeypatch.setenv("NATS_SERVER_IP_PORT", "127.0.0.1:4222")
    monkeypatch.setenv("KAFKA_BROKER_IP", "127.0.0.1")
    monkeypatch.setenv("KAFKA_BROKER_PORT", "9092")
    monkeypatch.setenv("KAFKA_BRIDGE_UNIT_ID", "unit_01")
    monkeypatch.setenv("KAFKA_BRIDGE_UNIT_TYPE", "infrastructure")


def test_config_nats_url_strips_duplicate_scheme(min_env, monkeypatch):
    monkeypatch.setenv("NATS_SERVER_IP_PORT", "nats://10.0.0.1:4222")
    cfg = BridgeConfig()
    assert cfg.nats_url == "nats://10.0.0.1:4222"


def test_config_nats_url_prepends_scheme_when_missing(min_env, monkeypatch):
    monkeypatch.setenv("NATS_SERVER_IP_PORT", "10.0.0.1:4222")
    cfg = BridgeConfig()
    assert cfg.nats_url == "nats://10.0.0.1:4222"


def test_config_exclusion_list_parses_csv(min_env, monkeypatch):
    monkeypatch.setenv("KAFKA_BRIDGE_EXCLUSION_LIST", " spat, bsm , map ")
    cfg = BridgeConfig()
    assert cfg.exclusion_list == ["spat", "bsm", "map"]


def test_config_exclusion_list_empty_when_unset(min_env, monkeypatch):
    monkeypatch.delenv("KAFKA_BRIDGE_EXCLUSION_LIST", raising=False)
    cfg = BridgeConfig()
    assert cfg.exclusion_list == []


def test_config_log_path_trailing_slash_added(min_env, monkeypatch):
    monkeypatch.setenv("KAFKA_BRIDGE_LOG_PATH", "/var/logs")
    cfg = BridgeConfig()
    assert cfg.kafka_bridge_log_path == "/var/logs/"


def test_config_missing_required_field_raises(min_env, monkeypatch):
    from pydantic import ValidationError
    monkeypatch.delenv("KAFKA_BRIDGE_UNIT_ID")
    with pytest.raises(ValidationError):
        BridgeConfig()


def test_config_defaults_are_applied(min_env):
    cfg = BridgeConfig()
    assert cfg.kafka_consumer_reset == "earliest"
    assert cfg.nats_reconnect_time_wait_seconds == 1.0
    assert cfg.kafka_max_retries == 5
    assert cfg.nats_publish_max_retries == 3
    assert cfg.is_sim is False
    assert cfg.kafka_bridge_unit_name == "West Intersection"


def test_config_is_sim_parses_true_string(min_env, monkeypatch):
    monkeypatch.setenv("IS_SIM", "true")
    assert BridgeConfig().is_sim is True


def test_config_injected_into_bridge(min_env):
    cfg = BridgeConfig()
    bridge = KafkaNatsBridge(config=cfg)
    assert bridge.nats_url == cfg.nats_url
    assert bridge.unit_id == cfg.kafka_bridge_unit_id
    assert bridge.exclusion_list == cfg.exclusion_list


def test_nats_connect_uses_reconnect_settings_and_recovers(bridge_env, monkeypatch):
    bridge = KafkaNatsBridge()
    bridge.nats_reconnect_wait = 3.5
    bridge.registered = True

    observed = {}
    recovered = {"called": False}

    async def _recover():
        recovered["called"] = True

    async def _connect(url, **kwargs):
        observed["url"] = url
        observed["kwargs"] = kwargs
        await kwargs["disconnected_cb"]()
        await kwargs["reconnected_cb"]()

    monkeypatch.setattr(bridge, "recover_after_nats_reconnect", _recover)
    monkeypatch.setattr(bridge.nc, "connect", _connect)

    asyncio.run(bridge.nats_connect())

    assert observed["url"] == "nats://127.0.0.1:4222"
    assert observed["kwargs"]["max_reconnect_attempts"] == -1
    assert observed["kwargs"]["reconnect_time_wait"] == 3.5
    assert recovered["called"] is True
    assert bridge.registered is False


def test_kafka_consumer_retries_before_success(bridge_env, monkeypatch):
    bridge = KafkaNatsBridge()
    bridge.kafka_max_retries = 3

    attempts = {"count": 0}

    async def _start_kafka_consumer():
        attempts["count"] += 1
        if attempts["count"] < 3:
            raise RuntimeError("broker down")

    async def _sleep(_):
        return None

    monkeypatch.setattr(bridge, "start_kafka_consumer", _start_kafka_consumer)
    monkeypatch.setattr(asyncio, "sleep", _sleep)

    asyncio.run(bridge.start_kafka_consumer_with_retry())

    assert attempts["count"] == 3


def test_kafka_consumer_retry_exhaustion_raises(bridge_env, monkeypatch):
    bridge = KafkaNatsBridge()
    bridge.kafka_max_retries = 2

    async def _start_kafka_consumer():
        raise RuntimeError("broker down")

    async def _sleep(_):
        return None

    monkeypatch.setattr(bridge, "start_kafka_consumer", _start_kafka_consumer)
    monkeypatch.setattr(asyncio, "sleep", _sleep)

    with pytest.raises(RuntimeError, match="max retries"):
        asyncio.run(bridge.start_kafka_consumer_with_retry())


def test_check_status_returns_error_on_publish_failure(bridge_env, monkeypatch):
    bridge = KafkaNatsBridge()

    observed = {"cb": None}
    publishes = []

    async def _subscribe(_subject, _queue, cb):
        observed["cb"] = cb

    async def _publish_with_retry(subject, payload):
        publishes.append((subject, payload))
        return payload == b"ERROR"

    monkeypatch.setattr(bridge.nc, "subscribe", _subscribe)
    monkeypatch.setattr(bridge, "publish_with_retry", _publish_with_retry)

    asyncio.run(bridge.check_status())

    assert observed["cb"] is not None
    msg = SimpleNamespace(reply="reply.subject")
    asyncio.run(observed["cb"](msg))

    assert publishes == [
        ("reply.subject", b"OK"),
        ("reply.subject", b"ERROR"),
    ]


def test_publish_with_retry_records_failed_publish(bridge_env, monkeypatch):
    bridge = KafkaNatsBridge()
    bridge.nats_publish_max_retries = 1

    async def _publish(_subject, _payload):
        raise RuntimeError("nats unavailable")

    async def _sleep(_):
        return None

    monkeypatch.setattr(bridge.nc, "publish", _publish)
    monkeypatch.setattr(asyncio, "sleep", _sleep)

    result = asyncio.run(bridge.publish_with_retry("kafka.unit.data.topic", b"{}"))

    assert result is False
    assert len(bridge.failed_publish_messages) == 1
    assert bridge.failed_publish_messages[0]["subject"] == "kafka.unit.data.topic"


# ── BridgeLogger unit tests ────────────────────────────────────────────────────

import logging


def _make_config(monkeypatch, *, handler_type="console", level="info", log_name="test_bridge"):
    monkeypatch.setenv("NATS_SERVER_IP_PORT", "127.0.0.1:4222")
    monkeypatch.setenv("KAFKA_BROKER_IP", "127.0.0.1")
    monkeypatch.setenv("KAFKA_BROKER_PORT", "9092")
    monkeypatch.setenv("KAFKA_BRIDGE_UNIT_ID", "unit_01")
    monkeypatch.setenv("KAFKA_BRIDGE_UNIT_TYPE", "infra")
    monkeypatch.setenv("KAFKA_BRIDGE_LOG_HANDLER_TYPE", handler_type)
    monkeypatch.setenv("KAFKA_BRIDGE_LOG_LEVEL", level)
    monkeypatch.setenv("KAFKA_BRIDGE_LOG_NAME", log_name)
    monkeypatch.setenv("KAFKA_BRIDGE_LOG_PATH", "/tmp/")
    monkeypatch.setenv("KAFKA_BRIDGE_LOG_ROTATION_SIZE_BYTES", "1024")
    monkeypatch.setenv("KAFKA_CONSUMER_RESET", "earliest")
    return BridgeConfig()


def test_bridge_logger_is_bridge_logger_subclass(monkeypatch):
    cfg = _make_config(monkeypatch, log_name="test_subclass")
    logger = BridgeLogger.create(cfg)
    assert isinstance(logger, BridgeLogger)
    assert isinstance(logger, logging.Logger)


def test_bridge_logger_console_mode_has_one_stream_handler(monkeypatch):
    cfg = _make_config(monkeypatch, handler_type="console", log_name="test_console")
    logger = BridgeLogger.create(cfg)
    stream_handlers = [h for h in logger.handlers if isinstance(h, logging.StreamHandler)
                       and not isinstance(h, logging.FileHandler)]
    assert len(stream_handlers) == 1
    assert len(logger.handlers) == 1


def test_bridge_logger_all_mode_has_both_handlers(monkeypatch):
    cfg = _make_config(monkeypatch, handler_type="all", log_name="test_all")
    logger = BridgeLogger.create(cfg)
    has_stream = any(type(h) is logging.StreamHandler for h in logger.handlers)
    has_file = any(isinstance(h, logging.handlers.RotatingFileHandler) for h in logger.handlers)
    assert has_stream
    assert has_file
    assert len(logger.handlers) == 2


def test_bridge_logger_level_is_applied(monkeypatch):
    cfg = _make_config(monkeypatch, level="debug", log_name="test_debug_level")
    logger = BridgeLogger.create(cfg)
    assert logger.level == logging.DEBUG
    for h in logger.handlers:
        assert h.level == logging.DEBUG


def test_bridge_logger_handlers_cleared_on_recreate(monkeypatch):
    cfg = _make_config(monkeypatch, log_name="test_recreate")
    BridgeLogger.create(cfg)
    logger = BridgeLogger.create(cfg)  # second call
    assert len(logger.handlers) == 1  # not doubled


def test_bridge_uses_bridge_logger(monkeypatch):
    cfg = _make_config(monkeypatch, log_name="test_bridge_uses_logger")
    bridge = KafkaNatsBridge(config=cfg)
    assert isinstance(bridge.logger, BridgeLogger)
