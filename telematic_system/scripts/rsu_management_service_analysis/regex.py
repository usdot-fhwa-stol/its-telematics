import re

TRU_REGEX = re.compile(
    r"^\[(?P<ts>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3})\]\s+"
    r"(?P<file>[^\s:]+)\s+\(\d+\)\s+-\s+(?P<level>\w+)\s*:\s*(?P<msg>.*)$"
)

MGMT_REGEX = re.compile(
    r"^(?P<ts>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3})\s+"
    r"(?:\x1b\[\d+m)?(?P<level>\w+)\s*(?:\x1b\[m)?\s+"
    r"\[(?P<thread>[^\]]+)\]\s+(?P<class>[^\s]+)\s+-\s+(?P<msg>.*)$"
)

ANSI_CLEANER = re.compile(r"\x1b\[[0-9;]*m")
INFLUX_SUFFIX_RE = re.compile(r"(\d+)\s+\(bytes:\s*(\d+)\)$")
