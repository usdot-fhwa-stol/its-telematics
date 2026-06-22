# categorizer.py
import re
import json
from typing import Optional, Dict, Any
from models import ParsedEntry, LogMessage

INFLUX_WRITE_REG = re.compile(r"Built Influx line:\s*(\w+),", re.IGNORECASE)
INFLUX_BYTES_REG = re.compile(r"\(bytes:\s*(\d+)\)")
INFLUX_TS_REG = re.compile(r"\s(\d{13,})\s*\(bytes:|\s(\d{13,})\s*$") # match at end or before bytes
BATCH_WRITE_REG = re.compile(r"Wrote number of (\d+) records")

# Capture values mapped via assignment operator '=' or spaces ' '
PARAM_EXTRACTION_RE = re.compile(r"payload\.(?:payload\.)?(\w+)=([^,\s]+)")

def extract_influx_params(text: str) -> Dict[str, Any]:
    fields = {}
    for m in re.finditer(PARAM_EXTRACTION_RE, text):
        k, v = m.group(1), m.group(2)
        v = v.strip('"').rstrip('i')
        fields[k] = v
    return fields

def parse_and_categorize(entry: ParsedEntry, filepath: str) -> Optional[LogMessage]:
    level = entry.level or "INFO"
    msg_text = entry.message
    
    if entry.inner_format == "java":
        influx_m = INFLUX_WRITE_REG.search(msg_text)
        if influx_m:
            measurement = influx_m.group(1)
            f = extract_influx_params(msg_text)
            f["measurement"] = measurement
            
            byte_m = INFLUX_BYTES_REG.search(msg_text)
            f["bytes"] = int(byte_m.group(1)) if byte_m else 0
            
            ts_m = INFLUX_TS_REG.search(msg_text)
            if ts_m:
                # Capture either Group 1 or Group 2 depending on matched variant
                raw_ts = ts_m.group(1) or ts_m.group(2)
                if raw_ts:
                    f["influx_timestamp_ms"] = int(raw_ts)
                    
            if "rsuIp" in msg_text:
                ip_match = re.search(r"rsuIp=([0-9.]+)", msg_text)
                if ip_match:
                    f["rsu_ip"] = ip_match.group(1)
                    
            return LogMessage(
                timestamp=entry.docker_time,
                source_format="java",
                source_file=filepath,
                message_type=f"influx_msg_{measurement.lower()}",
                level=level,
                raw_message_text=msg_text,
                fields=f
            )
            
        batch_m = BATCH_WRITE_REG.search(msg_text)
        if batch_m:
            return LogMessage(
                timestamp=entry.docker_time,
                source_format="java",
                source_file=filepath,
                message_type="influx_batch_write",
                level=level,
                raw_message_text=msg_text,
                fields={"records_count": int(batch_m.group(1))}
            )

    elif entry.inner_format == "cpp" or entry.inner_format == "unknown":
        # Check both cpp and unknown lines for status updates or telemetry data packages
        if "Published:" in msg_text:
            idx = msg_text.find("{")
            if idx != -1:
                json_part = msg_text[idx:]
                try:
                    data = json.loads(json_part)
                    fields = {"raw_json": data}
                    meta = data.get("metadata", {})
                    if meta:
                        fields["rsu_ip"] = meta.get("rsu", {}).get("ip")
                        fields["unit_id"] = meta.get("unitId")
                        fields["topic"] = meta.get("topicName")
                        
                    return LogMessage(
                        timestamp=entry.docker_time,
                        source_format="cpp",
                        source_file=filepath,
                        message_type="cpp_published_message",
                        level=level,
                        raw_message_text=msg_text,
                        fields=fields
                    )
                except json.JSONDecodeError:
                    pass
                    
        if "ProcessRSUStatusMessage:" in msg_text:
            idx = msg_text.find("{")
            if idx != -1:
                try:
                    data = json.loads(msg_text[idx:])
                    return LogMessage(
                        timestamp=entry.docker_time,
                        source_format="cpp",
                        source_file=filepath,
                        message_type="rsu_status_event",
                        level=level,
                        raw_message_text=msg_text,
                        fields={"event": data.get("event"), "status": data.get("status"), "rsu_ip": data.get("rsu", {}).get("ip")}
                    )
                except json.JSONDecodeError:
                    pass

    clean_label_str = re.sub(r"[^a-zA-Z]+", "_", msg_text[:30]).lower().strip("_")
    fallback_category = f"untyped_{clean_label_str}" if clean_label_str else "generic"
    return LogMessage(
        timestamp=entry.docker_time,
        source_format=entry.inner_format,
        source_file=filepath,
        message_type=fallback_category,
        level=level,
        raw_message_text=msg_text,
        fields={}
    )