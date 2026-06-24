import json
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Generator, Optional, Tuple

from models import (
    BSM,
    BSMCoreData,
    BSMPayload,
    BSMTraceTags,
    InfluxBSMTraceRecord,
    InfluxWriteResult,
    LogMessage,
)
from regex import ANSI_CLEANER, INFLUX_SUFFIX_RE, MGMT_REGEX, TRU_REGEX

_MS_THRESHOLD = 9_999_999_999


def compute_latency_ms(source_timestamp: int, influx_timestamp: int) -> int:
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


def extract_tru_payload(msg_text: str) -> Tuple[str, Any]:
    if "Published:" in msg_text:
        try:
            json_str = msg_text.split("Published:", 1)[1].strip()
            raw_payload_bytes = len(json_str.encode("utf-8"))
            data = json.loads(json_str)

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

            payload_obj = BSMPayload(
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
                message=BSM(
                    messageId=inner_payload.get("messageId", ""),
                    coreData=bsm_core,
                    partII=bsm_val.get("partII", []),
                ),
            )
            return ("bsm_published", (payload_obj))
        except Exception:
            return ("tru_json_parse_failure", None)

    return ("generic_cpp_debug", None)


def extract_mgmt_payload(msg_text: str) -> Tuple[str, Any]:
    if "Built Influx line:" in msg_text:
        try:
            influx_part = msg_text.split("Built Influx line:", 1)[1].strip()
            suffix_match = INFLUX_SUFFIX_RE.search(influx_part)
            if not suffix_match:
                return "influx_line_built", None

            influx_ts = int(suffix_match.group(1))
            byte_size = int(suffix_match.group(2))

            payload = InfluxBSMTraceRecord(
                tags=BSMTraceTags(
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
        return "influx_batch_written", InfluxWriteResult(records_written=count)

    return "generic_java_info", None


def iter_log_messages(file_path: str) -> Generator[LogMessage, None, None]:
    path = Path(file_path)
    if not path.exists():
        return

    inner_format: Optional[str] = None
    level: Optional[str] = None
    logger_or_file: Optional[str] = None
    docker_time: Optional[datetime] = None
    message_parts: list[str] = []

    def flush() -> Optional[LogMessage]:
        if inner_format is None:
            return None

        message = "\n".join(message_parts)
        msg_type = "generic_fallback"
        payload_obj = None

        if inner_format == "cpp":
            msg_type, extracted = extract_tru_payload(message)
            payload_obj = extracted
        elif inner_format == "java":
            msg_type, payload_obj = extract_mgmt_payload(message)

        failure_types = {
            "tru_json_parse_failure",
            "tru_status_parse_failure",
            "mgmt_influx_parse_failure",
        }
        if msg_type in failure_types:
            print(
                f"[DROPPED - {msg_type.upper()}] Failed to extract payload: {message}"
            )

        return LogMessage(
            timestamp=docker_time,
            source_format=inner_format,
            source_file=logger_or_file or "unknown",
            message_type=msg_type,
            level=level or "INFO",
            raw_message_text=message,
            payload=payload_obj,
        )

    with path.open("r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            cleaned_line = ANSI_CLEANER.sub("", line).strip()
            if not cleaned_line:
                continue

            tru_match = TRU_REGEX.match(cleaned_line)
            mgmt_match = MGMT_REGEX.match(cleaned_line)

            if tru_match or mgmt_match:
                if inner_format is not None:
                    result = flush()
                    if result:
                        yield result

                if tru_match:
                    gd = tru_match.groupdict()
                    inner_format = "cpp"
                    level = gd["level"]
                    logger_or_file = gd["file"]
                    docker_time = datetime.strptime(gd["ts"], "%Y-%m-%d %H:%M:%S.%f")
                    message_parts = [gd["msg"]]
                else:
                    gd = mgmt_match.groupdict()
                    inner_format = "java"
                    level = gd["level"]
                    logger_or_file = gd["class"]
                    docker_time = datetime.strptime(gd["ts"], "%Y-%m-%d %H:%M:%S.%f")
                    message_parts = [gd["msg"]]
            else:
                if inner_format is not None:
                    message_parts.append(cleaned_line)
                else:
                    print(
                        f"[DROPPED - UNKNOWN FORMAT] Regex missed this line: {cleaned_line}"
                    )

    if inner_format is not None:
        result = flush()
        if result:
            yield result
