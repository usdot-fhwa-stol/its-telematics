import json
import logging
import re
import zoneinfo
from datetime import datetime, timezone
from pathlib import Path
from typing import Generator, Optional, Tuple

from models import LogMessage
from utils import (
    DROP,
    ANSI_CLEANER_RE,
    INFLUX_KEY_VALUE_RE,
    INFLUX_TIME_AND_BYTES_RE,
    RSU_MGMT_SERV_RE,
    TRU_INST_RE,
    _influx_value_to_num,
)

logger = logging.getLogger(__name__)

UTC = timezone.utc
EDT = zoneinfo.ZoneInfo("America/New_York")

_JSON_RE = re.compile(r"(\{.*)", re.DOTALL)

_SOURCE_TIMEZONE: dict[str, zoneinfo.ZoneInfo | timezone] = {
    "tru_instance": EDT,
    "rsu_management_service": UTC,  # if mgmt logs are also local time
}


def _parse_json_payload(raw: str) -> Tuple[str, Optional[dict]]:
    match = _JSON_RE.search(raw)
    if not match:
        return "no_match", None

    try:
        data = json.loads(match.group(1).strip())
    except json.JSONDecodeError:
        logger.warning("Failed to parse JSON payload: %.120s", raw)
        return "json_parse_failure", None

    topic_name = data.get("metadata", {}).get("topicName", "unknown")
    topic_suffix = topic_name.rsplit(".", 1)[-1]

    return f"{topic_suffix}_published", {"topic": topic_name, "data": data}


def _parse_influx_line(influx_line: str) -> Optional[dict]:
    suffix_match = INFLUX_TIME_AND_BYTES_RE.search(influx_line)
    if not suffix_match:
        return None

    body = influx_line[: suffix_match.start()]
    tag_section, _, field_section = body.partition(" ")
    tag_parts = tag_section.split(",")

    return {
        "measurement": tag_parts[0],
        "tags": {
            k: v
            for k, _, v in (p.partition("=") for p in tag_parts[1:])
            if k
        },
        "fields": {
            m.group(1): _influx_value_to_num(m.group(2))
            for m in INFLUX_KEY_VALUE_RE.finditer(field_section)
        },
        "influx_timestamp": int(suffix_match.group(1)),
        "bytes_size": int(suffix_match.group(2)),
    }


def _parse_mgmt_payload(raw: str) -> Tuple[str, Optional[dict]]:
    if "Built Influx line:" not in raw:
        return "no_match", None

    influx_line = raw.split("Built Influx line:", 1)[1].strip()
    parsed = _parse_influx_line(influx_line)

    if parsed is None:
        logger.warning("Failed to parse Influx line: %.120s", influx_line)
        return "influx_parse_failure", None

    return "influx_line_built", parsed


def _extract_time_key(
    source: str, msg_type: str, payload: Optional[dict]
) -> Optional[str]:
    if not isinstance(payload, dict):
        return None

    if source == "tru_instance":
        data = payload.get("data", {})
        ts = data.get("metadata", {}).get("timestamp")
    elif source == "rsu_management_service":
        ts = payload.get("influx_timestamp")
    else:
        ts = None

    return str(ts) if ts is not None else None


_TIMESTAMP_FORMATS = [
    "%Y-%m-%d %H:%M:%S.%f",
    "%Y-%m-%d %H:%M:%S",
    "%Y-%m-%d",
]

def _parse_timestamp(raw_ts: str, source: str) -> datetime:
    tz = _SOURCE_TIMEZONE[source]
    for fmt in _TIMESTAMP_FORMATS:
        try:
            dt = datetime.strptime(raw_ts, fmt)
            return dt.replace(tzinfo=tz).astimezone(UTC)
        except ValueError:
            continue
    raise ValueError(f"Unrecognised timestamp format: {raw_ts!r}")


def _within_window(
    ts: Optional[datetime],
    start_time: Optional[datetime],
    end_time: Optional[datetime],
) -> bool:
    if ts is None:
        return False
    if start_time is not None and ts < start_time:
        return False
    if end_time is not None and ts > end_time:
        return False
    return True


def iter_log_messages(
    file_path: str,
    *,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
) -> Generator[LogMessage, None, None]:
    path = Path(file_path)
    if not path.exists():
        logger.warning("Log file not found: %s", file_path)
        return

    filter_active = start_time is not None or end_time is not None

    source = level = origin = None
    message_parts: list[str] = []

    def flush() -> Optional[LogMessage]:
        if not source:
            return None

        if filter_active and not _within_window(log_time, start_time, end_time):
            return None

        raw_message = "\n".join(message_parts)

        if source == "tru_instance":
            msg_type, payload = _parse_json_payload(raw_message)
        else:
            msg_type, payload = _parse_mgmt_payload(raw_message)

        if msg_type in DROP:
            return None

        return LogMessage(
            timestamp=log_time,
            source_format=source,
            source_file=origin or "unknown",
            message_type=msg_type,
            level=level or "INFO",
            raw_message_text=raw_message,
            payload=payload,
            bytes_size=len(raw_message.encode("utf-8")),
            time_key=_extract_time_key(source, msg_type, payload),
        )

    with path.open("r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            cleaned = ANSI_CLEANER_RE.sub("", line).strip()
            if not cleaned:
                continue

            tru_match = TRU_INST_RE.match(cleaned)
            mgmt_match = RSU_MGMT_SERV_RE.match(cleaned)

            if tru_match or mgmt_match:
                if source:
                    if result := flush():
                        yield result

                match_dict = (tru_match or mgmt_match).groupdict()
                source = (
                    "tru_instance" if tru_match else "rsu_management_service"
                )
                level = match_dict.get("level")
                origin = match_dict.get("file") or match_dict.get("class")
                try:
                    log_time = _parse_timestamp(match_dict["ts"], source)
                except ValueError as e:
                    logger.warning("Timestamp parse failed: %s", e)
                    source = None
                    continue
                message_parts = [match_dict["msg"]]
            elif source:
                message_parts.append(cleaned)

    if source:
        if result := flush():
            yield result