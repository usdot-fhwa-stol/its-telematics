import json
from datetime import datetime
from pathlib import Path
from typing import Any, Generator, Optional, Tuple

from models import LogMessage
from utils import (
    _FAILURE_TYPES,
    _SILENT_DROP,
    ANSI_CLEANER_RE,
    INFLUX_FIELD_RE,
    INFLUX_SUFFIX_RE,
    MGMT_RE,
    TOPIC_RE,
    TRU_RE,
    _coerce_influx_value,
    _should_skip_topic,
)


def extract_topic_payload(msg_text: str) -> Tuple[str, Any]:
    topic_match = TOPIC_RE.search(msg_text)
    if not topic_match:
        return "no_match", None

    topic_name = topic_match.group(1)
    if _should_skip_topic(topic_name):
        return "skipped", None

    try:
        data = json.loads(topic_match.group(2).strip())
    except Exception:
        return "json_parse_failure", None

    topic_suffix = topic_name.rsplit(".", 1)[-1]
    return f"{topic_suffix}_published", {"topic": topic_name, "data": data}


def _parse_influx_line(influx_line: str) -> Optional[dict]:
    suffix_match = INFLUX_SUFFIX_RE.search(influx_line)
    if not suffix_match:
        return None

    body = influx_line[: suffix_match.start()]
    tag_section, _, field_section = body.partition(" ")
    tag_parts = tag_section.split(",")

    return {
        "measurement": tag_parts[0],
        "tags": {k: v for k, _, v in (p.partition("=") for p in tag_parts[1:]) if k},
        "fields": {
            m.group(1): _coerce_influx_value(m.group(2))
            for m in INFLUX_FIELD_RE.finditer(field_section)
        },
        "influx_timestamp": int(suffix_match.group(1)),
        "bytes_size": int(suffix_match.group(2)),
    }


def extract_mgmt_payload(msg_text: str) -> Tuple[str, Any]:
    if "Built Influx line:" in msg_text:
        parsed = _parse_influx_line(msg_text.split("Built Influx line:", 1)[1].strip())
        return (
            ("influx_line_built", parsed) if parsed else ("influx_parse_failure", None)
        )

    return "no_match", None


def iter_log_messages(file_path: str) -> Generator[LogMessage, None, None]:
    path = Path(file_path)
    if not path.exists():
        return

    log_source = level = logger_or_file = log_time = None
    message_parts = []

    def flush() -> Optional[LogMessage]:
        if not log_source:
            return None

        message = "\n".join(message_parts)
        if log_source == "tru_instance":
            msg_type, payload_obj = extract_topic_payload(message)
        elif log_source == "rsu_management_service":
            msg_type, payload_obj = extract_mgmt_payload(message)
        else:
            msg_type, payload_obj = "no_file", None

        if msg_type in _SILENT_DROP:
            return None

        if msg_type in _FAILURE_TYPES:
            print(f"[DROPPED - {msg_type.upper()}] Failed to parse: {message}")
            return None

        return LogMessage(
            timestamp=log_time,
            source_format=log_source,
            source_file=logger_or_file or "unknown",
            message_type=msg_type,
            level=level or "INFO",
            raw_message_text=message,
            payload=payload_obj,
        )

    with path.open("r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            cleaned_line = ANSI_CLEANER_RE.sub("", line).strip()
            if not cleaned_line:
                continue

            tru_match = TRU_RE.match(cleaned_line)
            mgmt_match = MGMT_RE.match(cleaned_line)

            if tru_match or mgmt_match:
                if log_source:
                    if result := flush():
                        yield result

                match_dict = (tru_match or mgmt_match).groupdict()
                log_source = "tru_instance" if tru_match else "rsu_management_service"
                level = match_dict.get("level")
                logger_or_file = match_dict.get("file") or match_dict.get("class")
                log_time = datetime.strptime(match_dict["ts"], "%Y-%m-%d %H:%M:%S.%f")
                message_parts = [match_dict["msg"]]
            elif log_source:
                message_parts.append(cleaned_line)

    if log_source:
        if result := flush():
            yield result
