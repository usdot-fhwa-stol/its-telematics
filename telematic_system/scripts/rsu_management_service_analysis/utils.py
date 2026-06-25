import re
from typing import Any

INFLUX_FIELD_RE = re.compile(r'([\w.\[\]-]+)=("(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?i?)')
TRU_RE = re.compile(
    r"^\[(?P<ts>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3})\]\s+"
    r"(?P<file>[^\s:]+)\s+\(\d+\)\s+-\s+(?P<level>\w+)\s*:\s*(?P<msg>.*)$"
)
MGMT_RE = re.compile(
    r"^(?P<ts>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3})\s+"
    r"(?:\x1b\[\d+m)?(?P<level>\w+)\s*(?:\x1b\[m)?\s+"
    r"\[(?P<thread>[^\]]+)\]\s+(?P<class>[^\s]+)\s+-\s+(?P<msg>.*)$"
)
ANSI_CLEANER_RE = re.compile(r"\x1b\[[0-9;]*m")
INFLUX_SUFFIX_RE = re.compile(r"(\d+)\s+\(bytes:\s*(\d+)\)$")

_SILENT_DROP = {"skipped", "no_match"}
_FAILURE_TYPES = {"json_parse_failure", "influx_parse_failure"}


def compute_latency_ms(source_timestamp: int, influx_timestamp: int) -> int:
    if source_timestamp > 9_999_999_999:
        return influx_timestamp - source_timestamp
    return influx_timestamp - (source_timestamp * 1000)


def _coerce_influx_value(raw: str) -> Any:
    if raw.startswith('"'):
        return raw[1:-1]
    if raw.endswith("i"):
        return int(raw[:-1])
    try:
        return float(raw)
    except ValueError:
        return raw
