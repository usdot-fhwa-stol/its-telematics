from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional, Union


# ---------------------------------------------------------
# TRU Instance BSM
# ---------------------------------------------------------
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
# RSU Mgmt Service InfluxDB BSM Trace
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
    payload: Optional[
        Union[
            BSMPayload,
            InfluxBSMTraceRecord,
            InfluxWriteResult,
            Dict[str, Any],
        ]
    ] = None
