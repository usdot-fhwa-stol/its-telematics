from dataclasses import dataclass
from datetime import datetime
from typing import Any, Tuple


@dataclass
class LogMessage:
    timestamp: datetime
    source_format: str
    source_file: str
    message_type: str
    level: str
    raw_message_text: str
    payload: Tuple[str, Any]
