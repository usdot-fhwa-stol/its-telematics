from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional, Union


# ---------------------------------------------------------
# Telemetry & V2X Sub-Models
# ---------------------------------------------------------
@dataclass
class RSUConnection:
    ip: str
    port: int


@dataclass
class MessageMetadata:
    event: str
    rsu: RSUConnection
    timestamp: str
    topicName: str
    unitId: str


@dataclass
class BSMCoreData:
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
    messageId: str
    coreData: BSMCoreData
    partII: List[Dict[str, Any]] = field(default_factory=list)


# ---------------------------------------------------------
# Management Service Health Sub-Models
# ---------------------------------------------------------
@dataclass
class UnitHealthConfig:
    unit_id: str
    bridge_plugin_status: str
    last_updated_timestamp: Optional[int]
    timestamp: Optional[int]


@dataclass
class TRUHealthStatusMessage:
    unit_config: UnitHealthConfig
    timestamp: int
    bytes_size: int
    rsu_configs: List[Dict[str, Any]] = field(default_factory=list)


# ---------------------------------------------------------
# InfluxDB Ingestion & Latency Tracing Models
# ---------------------------------------------------------
@dataclass
class InfluxLineTags:
    measurement: str
    unit_id: str
    rsu_ip: str
    topic_name: str
    port: int


@dataclass
class MgmtBSMTraceMetrics:
    tags: InfluxLineTags
    msg_cnt: int
    bsm_id: str
    sec_mark: int
    source_timestamp: int  # payload.timestamp from the line fields
    influx_timestamp: int  # terminal epoch timestamp at end of line
    bytes_size: int


@dataclass
class InfluxBatchWrite:
    records_written: int


# ---------------------------------------------------------
# Top-Level Log Payloads
# ---------------------------------------------------------
@dataclass
class BSMTelematicPayload:
    channel: int
    encoding: str
    flags: int
    psid: int
    source: str
    sourceId: int
    subType: str
    timestamp: int
    type: str
    bytes_size: int
    message: BasicSafetyMessage


@dataclass
class RSUStatusPayload:
    event: str
    rsu: RSUConnection
    status: str


# ---------------------------------------------------------
# Base Message Model
# ---------------------------------------------------------
@dataclass
class LogMessage:
    timestamp: datetime
    source_format: str  # 'java' (Mgmt) | 'cpp' (TRU)
    source_file: str
    message_type: str
    level: str
    raw_message_text: str
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
