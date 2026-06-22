# parser.py
import json
import re
from datetime import datetime, timezone
from typing import Optional, Generator, Tuple
from models import ParsedEntry

ANSI_RE = re.compile(r"\x1b\[[0-9;]*m")

# Flexible formats searching inside raw lines
JAVA_LOG_RE = re.compile(
    r"(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d+)"  # timestamp
    r"\s+(\w+)\s+"                                   # level
    r"\[([^\]]+)\]"                                  # thread
    r"\s+([\w.$:#-]+)\s+-\s+"                         # logger
    r"(.*)"                                          # msg
)

CPP_LOG_RE = re.compile(
    r"\[(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2}\.\d+)\]"  # dynamic space handling
    r"\s+(\S+)\s+"                                        # file
    r"\((\d+)\)\s+-\s+"                                   # line
    r"(\w+)\s*:\s*"                                       # level
    r"(.*)"                                               # msg
)

def strip_ansi(s: str) -> str:
    return ANSI_RE.sub("", s)

def parse_docker_time(time_str: str) -> datetime:
    clean = re.sub(r"(\.\d{6})\d*Z$", r"\1+00:00", time_str)
    return datetime.fromisoformat(clean)

class StatefulStreamAssembler:
    def __init__(self):
        self._buffer: list[Tuple[datetime, str]] = []

    def _is_complete(self) -> bool:
        combined = "".join(t for _, t in self._buffer)
        b_opens, b_closes = combined.count("{"), combined.count("}")
        s_opens, s_closes = combined.count("["), combined.count("]")
        return b_opens == b_closes and s_opens == s_closes

    def feed(self, ts: datetime, inner: str) -> Optional[Tuple[datetime, list[str]]]:
        is_new_entry = bool(CPP_LOG_RE.search(inner))
        
        if is_new_entry and self._buffer:
            result = (self._buffer[0][0], [t for _, t in self._buffer])
            self._buffer = [(ts, inner)]
            return result
            
        self._buffer.append((ts, inner))
        
        if len(self._buffer) > 1 and self._is_complete():
            result = (self._buffer[0][0], [t for _, t in self._buffer])
            self._buffer = []
            return result
            
        return None

    def flush(self) -> Optional[Tuple[datetime, list[str]]]:
        if self._buffer:
            result = (self._buffer[0][0], [t for _, t in self._buffer])
            self._buffer = []
            return result
        return None


def iter_parsed_entries(path: str) -> Generator[ParsedEntry, None, None]:
    assembler = StatefulStreamAssembler()
    
    with open(path, "r", encoding="utf-8", errors="replace") as fh:
        for raw_line in fh:
            line_str = raw_line.strip()
            if not line_str:
                continue
                
            try:
                obj = json.loads(line_str)
            except json.JSONDecodeError:
                continue

            time_str = obj.get("time", "")
            inner_log = strip_ansi(obj.get("log", "").rstrip("\r\n").strip())
            if not inner_log:
                continue

            try:
                ts = parse_docker_time(time_str)
            except ValueError:
                ts = datetime.min.replace(tzinfo=timezone.utc)

            # Re-architect search logic to look inside line strings
            if "[" in inner_log and "]" in inner_log:
                completed = assembler.feed(ts, inner_log)
                if completed:
                    yield build_cpp_entry(completed[0], completed[1])
            else:
                leftover = assembler.flush()
                if leftover:
                    yield build_cpp_entry(leftover[0], leftover[1])
                yield build_java_or_unknown_entry(ts, inner_log)

        leftover = assembler.flush()
        if leftover:
            yield build_cpp_entry(leftover[0], leftover[1])


def build_java_or_unknown_entry(ts: datetime, inner: str) -> ParsedEntry:
    m = JAVA_LOG_RE.search(inner)
    if m:
        return ParsedEntry(
            docker_time=ts,
            inner_format="java",
            level=m.group(2).strip(),
            logger_or_file=m.group(4),
            message=m.group(5).strip(),
            source_lines=[inner]
        )
    return ParsedEntry(
        docker_time=ts,
        inner_format="unknown",
        level=None,
        logger_or_file=None,
        message=inner,
        source_lines=[inner]
    )


def build_cpp_entry(ts: datetime, lines: list[str]) -> ParsedEntry:
    first = lines[0]
    m = CPP_LOG_RE.search(first)
    
    if m:
        body_parts = [m.group(6).strip()] + [l.strip() for l in lines[1:]]
        full_msg = " ".join(part for part in body_parts if part)
        return ParsedEntry(
            docker_time=ts,
            inner_format="cpp",
            level=m.group(5).strip(),
            logger_or_file=m.group(3),
            message=full_msg,
            source_lines=lines
        )
    
    return ParsedEntry(
        docker_time=ts,
        inner_format="cpp",
        level=None,
        logger_or_file=None,
        message=" ".join(lines),
        source_lines=lines
    )