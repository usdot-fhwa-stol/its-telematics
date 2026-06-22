# models.py
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional, Set


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
    """A high-level processed and categorized system event."""

    timestamp: datetime  # Authoritative UTC time
    source_format: str  # 'java' | 'cpp'
    source_file: str
    message_type: str  # Category (e.g. influx_line_bsm, rsu_status_update)
    level: str
    raw_message_text: str  # Inner log text parsed
    fields: Dict[str, Any] = field(default_factory=dict)


@dataclass
class RunMetrics:
    """Dynamic tracking counters for a given execution sweep."""

    total_entries_read: int = 0
    parse_failures: int = 0
    by_type: Dict[str, int] = field(default_factory=lambda: {})
    by_level: Dict[str, int] = field(default_factory=lambda: {})
