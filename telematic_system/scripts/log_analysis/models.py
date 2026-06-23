from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional, Union


# ---------------------------------------------------------
# RSU
# ---------------------------------------------------------
@dataclass
class RSUEndpoint:
    ip: str
    port: int


@dataclass
class RSUStatusPayload:
    event: str
    rsu: RSUEndpoint
    status: str


# ---------------------------------------------------------
# BSM
# ---------------------------------------------------------
@dataclass
class BSMEventMetadata:
    event: str
    rsu: RSUEndpoint
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
class BSM:
    messageId: str
    coreData: BSMCoreData
    partII: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class BSMPayload:
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
    message: BSM


# ---------------------------------------------------------
# TRU
# ---------------------------------------------------------
@dataclass
class TRUUnitStatus:
    unit_id: str
    bridge_plugin_status: str
    last_updated_timestamp: Optional[int]
    timestamp: Optional[int]


@dataclass
class TRUHealthPayload:
    unit_config: TRUUnitStatus
    timestamp: int
    bytes_size: int
    rsu_configs: List[Dict[str, Any]] = field(default_factory=list)


# ---------------------------------------------------------
# Mgmt InfluxDB BSM Trace
# ---------------------------------------------------------
@dataclass
class BSMTraceTags:
    measurement: str
    unit_id: str
    rsu_ip: str
    topic_name: str
    port: int


@dataclass
class InfluxBSMTraceRecord:
    tags: BSMTraceTags
    msg_cnt: int
    bsm_id: str
    sec_mark: int
    source_timestamp: int
    influx_timestamp: int
    bytes_size: int


@dataclass
class InfluxWriteResult:
    records_written: int


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
    metadata: Optional[BSMEventMetadata] = None
    payload: Optional[
        Union[
            BSMPayload,
            RSUStatusPayload,
            TRUHealthPayload,
            InfluxBSMTraceRecord,
            InfluxWriteResult,
            Dict[str, Any],
        ]
    ] = None
