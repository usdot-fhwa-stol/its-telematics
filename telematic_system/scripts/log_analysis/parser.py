import json
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Generator, Optional, Tuple

from models import (
    BasicSafetyMessage,
    BSMCoreData,
    BSMTelematicPayload,
    InfluxBatchWrite,
    InfluxLineTags,
    LogMessage,
    MessageMetadata,
    MgmtBSMTraceMetrics,
    ParsedEntry,
    RSUConnection,
    RSUStatusPayload,
    TRUHealthStatusMessage,
    UnitHealthConfig,
)
from regex import ANSI_CLEANER, INFLUX_SUFFIX_RE, MGMT_REGEX, TRU_REGEX

_MS_THRESHOLD = 9_999_999_999


def compute_latency_ms(source_timestamp: int, influx_timestamp: int) -> int:
    """End-to-end latency in ms, normalizing the source timestamp to ms."""
    if source_timestamp > _MS_THRESHOLD:
        return influx_timestamp - source_timestamp
    return influx_timestamp - (source_timestamp * 1000)


def safe_search_str(pattern: str, text: str, default: str = "unknown") -> str:
    match = re.search(pattern, text)
    return match.group(1) if match else default


def safe_search_int(pattern: str, text: str, default: int = 0) -> int:
    match = re.search(pattern, text)
    if match and match.group(1).replace("-", "").isdigit():
        return int(match.group(1))
    return default


def parse_datetime(ts_str: str) -> datetime:
    return datetime.strptime(ts_str, "%Y-%m-%d %H:%M:%S.%f")


def extract_tru_payload(msg_text: str) -> Tuple[str, Any]:
    if "Published:" in msg_text:
        try:
            json_str = msg_text.split("Published:", 1)[1].strip()
            raw_payload_bytes = len(json_str.encode("utf-8"))
            data = json.loads(json_str)

            meta = data.get("metadata", {})
            rsu = meta.get("rsu", {})
            metadata_obj = MessageMetadata(
                event=meta.get("event", ""),
                rsu=RSUConnection(ip=rsu.get("ip", ""), port=int(rsu.get("port", 0))),
                timestamp=meta.get("timestamp", ""),
                topicName=meta.get("topicName", ""),
                unitId=meta.get("unitId", ""),
            )

            payload_wrapper = data.get("payload", {})
            inner_payload = payload_wrapper.get("payload", {})
            bsm_val = inner_payload.get("value", {}).get("BasicSafetyMessage", {})
            core = bsm_val.get("coreData", {})

            bsm_core = BSMCoreData(
                msgCnt=core.get("msgCnt", "0"),
                id=core.get("id", ""),
                secMark=core.get("secMark", "0"),
                lat=core.get("lat", "0"),
                long=core.get("long", "0"),
                elev=core.get("elev", "0"),
                speed=core.get("speed", "0"),
                heading=core.get("heading", "0"),
                angle=core.get("angle", "0"),
                accelSet=core.get("accelSet", {}),
                brakes=core.get("brakes", {}),
                size=core.get("size", {}),
                accuracy=core.get("accuracy", {}),
            )

            payload_obj = BSMTelematicPayload(
                channel=int(payload_wrapper.get("channel", -1)),
                encoding=payload_wrapper.get("encoding", ""),
                flags=int(payload_wrapper.get("flags", 0)),
                psid=int(payload_wrapper.get("psid", -1)),
                source=payload_wrapper.get("source", ""),
                sourceId=int(payload_wrapper.get("sourceId", 0)),
                subType=payload_wrapper.get("subType", ""),
                timestamp=int(payload_wrapper.get("timestamp", 0)),
                type=payload_wrapper.get("type", ""),
                bytes_size=raw_payload_bytes,
                message=BasicSafetyMessage(
                    messageId=inner_payload.get("messageId", ""),
                    coreData=bsm_core,
                    partII=bsm_val.get("partII", []),
                ),
            )
            return ("bsm_published", (metadata_obj, payload_obj))
        except Exception:
            return ("tru_json_parse_failure", None)

    if "ProcessRSUStatusMessage:" in msg_text:
        try:
            json_str = msg_text.split("ProcessRSUStatusMessage:", 1)[1].strip()
            data = json.loads(json_str)
            rsu = data.get("rsu", {})
            payload_obj = RSUStatusPayload(
                event=data.get("event", ""),
                rsu=RSUConnection(ip=rsu.get("ip", ""), port=int(rsu.get("port", 0))),
                status=data.get("status", ""),
            )
            return ("rsu_status_update", (None, payload_obj))
        except Exception:
            return ("tru_status_parse_failure", None)

    return ("generic_cpp_debug", None)


def extract_mgmt_payload(msg_text: str) -> Tuple[str, Any]:
    if "Handling Unit Health Status Message:" in msg_text:
        try:
            unit_id = safe_search_str(r"unitId=([^,\s)]+)", msg_text)
            status = safe_search_str(r"bridgePluginStatus=([^,\s)]+)", msg_text)
            lut = safe_search_int(r"lastUpdatedTimestamp=(\d+)", msg_text, default=-1)

            ts_match = re.findall(r"timestamp=(\d+)", msg_text)
            top_ts = int(ts_match[-1]) if ts_match else 0

            payload = TRUHealthStatusMessage(
                unit_config=UnitHealthConfig(
                    unit_id=unit_id,
                    bridge_plugin_status=status,
                    last_updated_timestamp=lut if lut != -1 else None,
                    timestamp=None,
                ),
                timestamp=top_ts,
            )
            return "tru_health_status", payload
        except Exception:
            return "mgmt_health_parse_failure", None

    if "Built Influx line:" in msg_text:
        try:
            influx_part = msg_text.split("Built Influx line:", 1)[1].strip()
            suffix_match = INFLUX_SUFFIX_RE.search(influx_part)
            if not suffix_match:
                return "influx_line_built", None

            influx_ts = int(suffix_match.group(1))
            byte_size = int(suffix_match.group(2))

            payload = MgmtBSMTraceMetrics(
                tags=InfluxLineTags(
                    measurement=influx_part.split(",", 1)[0],
                    unit_id=safe_search_str(r"unitId=([^,\s]+)", influx_part),
                    rsu_ip=safe_search_str(r"rsuIp=([^,\s]+)", influx_part),
                    topic_name=safe_search_str(r"topicName=([^,\s]+)", influx_part),
                    port=safe_search_int(r"port=(\d+)", influx_part),
                ),
                msg_cnt=safe_search_int(r"coreData\.msgCnt=(\d+)", influx_part),
                bsm_id=safe_search_str(r'coreData\.id="([^"]+)"', influx_part),
                sec_mark=safe_search_int(r"coreData\.secMark=(\d+)", influx_part),
                source_timestamp=safe_search_int(
                    r"payload\.timestamp=(\d+)", influx_part
                ),
                influx_timestamp=influx_ts,
                bytes_size=byte_size,
            )
            return "influx_line_built", payload
        except Exception:
            return "mgmt_influx_parse_failure", None

    if "Wrote number of" in msg_text:
        count = safe_search_int(r"Wrote number of (\d+) records", msg_text)
        return "influx_batch_written", InfluxBatchWrite(records_written=count)

    return "generic_java_info", None


def iter_parsed_entries(file_path: str) -> Generator[ParsedEntry, None, None]:
    path = Path(file_path)
    if not path.exists():
        return

    with path.open("r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            cleaned_line = ANSI_CLEANER.sub("", line).strip()
            if not cleaned_line:
                continue

            tru_match = TRU_REGEX.match(cleaned_line)
            if tru_match:
                gd = tru_match.groupdict()
                yield ParsedEntry(
                    docker_time=parse_datetime(gd["ts"]),
                    inner_format="cpp",
                    level=gd["level"],
                    logger_or_file=gd["file"],
                    message=gd["msg"],
                    source_lines=[line],
                )
                continue

            mgmt_match = MGMT_REGEX.match(cleaned_line)
            if mgmt_match:
                gd = mgmt_match.groupdict()
                yield ParsedEntry(
                    docker_time=parse_datetime(gd["ts"]),
                    inner_format="java",
                    level=gd["level"],
                    logger_or_file=gd["class"],
                    message=gd["msg"],
                    source_lines=[line],
                )
                continue

            yield ParsedEntry(
                docker_time=datetime.utcnow(),
                inner_format="unknown",
                level="UNKNOWN",
                logger_or_file=None,
                message=cleaned_line,
                source_lines=[line],
            )


def parse_and_categorize(entry: ParsedEntry, file_path: str) -> Optional[LogMessage]:
    if entry.inner_format == "unknown":
        return None

    msg_type = "generic_fallback"
    metadata_obj = None
    payload_obj = None

    if entry.inner_format == "cpp":
        msg_type, extracted = extract_tru_payload(entry.message)
        if isinstance(extracted, tuple):
            metadata_obj, payload_obj = extracted
        else:
            payload_obj = extracted
    elif entry.inner_format == "java":
        msg_type, payload_obj = extract_mgmt_payload(entry.message)

    return LogMessage(
        timestamp=entry.docker_time,
        source_format=entry.inner_format,
        source_file=entry.logger_or_file or "unknown",
        message_type=msg_type,
        level=entry.level or "INFO",
        raw_message_text=entry.message,
        metadata=metadata_obj,
        payload=payload_obj,
    )
