from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional, Union


# ---------------------------------------------------------
# Telemetry & V2X Sub-Models
# ---------------------------------------------------------
@dataclass
class RSUConnection:
    """Represents the target Roadside Unit."""

    ip: str
    port: int


@dataclass
class MessageMetadata:
    """Standard metadata wrapper found in telematic streams."""

    event: str
    rsu: RSUConnection
    timestamp: str
    topicName: str
    unitId: str


@dataclass
class BSMCoreData:
    """J2735 Basic Safety Message Core Data."""

    msgCnt: str
    id: str
    secMark: str
    lat: str
    long: str
    elev: str
    speed: str
    heading: str
    angle: str
    accelSet: Dict[str, str]
    brakes: Dict[str, str]
    size: Dict[str, str]
    accuracy: Dict[str, str]


@dataclass
class BasicSafetyMessage:
    """J2735 BSM Wrapper including optional Part II extensions."""

    messageId: str
    coreData: BSMCoreData
    partII: List[Dict[str, Any]] = field(default_factory=list)


# append to models.py


# ---------------------------------------------------------
# Management Service Health Sub-Models
# ---------------------------------------------------------
@dataclass
class UnitHealthConfig:
    """Parsed from UnitHealthStatusMessage(...) string."""

    unit_id: str
    bridge_plugin_status: str
    last_updated_timestamp: Optional[int]
    timestamp: Optional[int]


@dataclass
class TRUHealthStatusMessage:
    """Top-level container for handling Unit Health Status logs."""

    unit_config: UnitHealthConfig
    timestamp: int
    rsu_configs: List[Dict[str, Any]] = field(default_factory=list)


# ---------------------------------------------------------
# InfluxDB Ingestion & Latency Tracing Models
# ---------------------------------------------------------
@dataclass
class InfluxLineTags:
    """The routing and identity tags embedded at the start of the Influx line."""

    measurement: str  # e.g., "IntegrationTest2"
    unit_id: str  # e.g., "Unit001"
    rsu_ip: str  # e.g., "192.168.55.72"
    topic_name: str  # e.g., "J2735_BSM_MessageReceiver"
    port: int


@dataclass
class MgmtBSMTraceMetrics:
    """
    Captures critical telemetry identifiers and performance tracing properties.
    Designed specifically to calculate processing latency pipeline deltas.
    """

    tags: InfluxLineTags
    msg_cnt: int
    bsm_id: str
    sec_mark: int

    # Timing fields for Latency Data (E2E Analysis)
    source_timestamp: int  # payload.timestamp (extracted from the fields)
    influx_timestamp: int  # The terminal epoch timestamp at the end of the line
    bytes_size: int  # Extracted from the log suffix (bytes: X)


@dataclass
class InfluxBatchWrite:
    """Model tracking database pipeline confirmations."""

    records_written: int


# ---------------------------------------------------------
# Top-Level Log Payloads
# ---------------------------------------------------------
@dataclass
class BSMTelematicPayload:
    """The full payload wrapper for a BSM broadcast event."""

    channel: int
    encoding: str
    flags: int
    psid: int
    source: str
    sourceId: int
    subType: str
    timestamp: int
    type: str
    message: BasicSafetyMessage


@dataclass
class RSUStatusPayload:
    """Payload for RSU Health/Management Status events."""

    event: str
    rsu: RSUConnection
    status: str


# ---------------------------------------------------------
# Base Container Models
# ---------------------------------------------------------
@dataclass
class ParsedEntry:
    """A raw unpacked container holding lines tied to one logical event."""

    docker_time: datetime
    inner_format: str  # 'java' | 'cpp' | 'unknown'
    level: Optional[str]
    logger_or_file: Optional[str]
    message: str  # Aggregated inner text
    source_lines: List[str] = field(default_factory=list)


@dataclass
class LogMessage:
    timestamp: datetime
    source_format: str  # 'java' (for Mgmt service) | 'cpp' (for TRU)
    source_file: str  # e.g., 'DataIngestionDepositor'
    message_type: (
        str  # 'tru_health_status' | 'influx_line_built' | 'influx_batch_written'
    )
    level: str
    raw_message_text: str

    # Updated to hold the new structured data targets
    metadata: Optional[MessageMetadata] = None
    payload: Optional[
        Union[
            BSMTelematicPayload,
            RSUStatusPayload,
            TRUHealthStatusMessage,
            MgmtBSMTraceMetrics,
            InfluxBatchWrite,
            Dict[str, Any],
        ]
    ] = None
