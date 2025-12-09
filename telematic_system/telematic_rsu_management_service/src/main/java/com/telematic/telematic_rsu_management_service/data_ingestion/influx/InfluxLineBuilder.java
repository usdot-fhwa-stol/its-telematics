package com.telematic.telematic_rsu_management_service.data_ingestion.influx;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class InfluxLineBuilder {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Value("${data.ingestion.influx.remove-fields:}")
    private String removeFieldsProp;

    public String buildLine(String json) throws Exception {
        JsonNode root = MAPPER.readTree(json);
        JsonNode metadata = root.path("metadata");
        JsonNode payload = root.path("payload");

        String event = sanitize(metadata.path("event").asText("unknown"));
        String measurement = event;

        Map<String, String> tags = new LinkedHashMap<>();
        tags.put("unitId", sanitize(metadata.path("unitId").asText("")));
        tags.put("rsuIp", sanitize(metadata.path("rsuIp").asText("")));
        tags.put("port", sanitize(metadata.path("port").asText("")));
        tags.put("topicName", sanitize(metadata.path("topicName").asText("")));

        Map<String, String> fields = new LinkedHashMap<>();
        flatten("payload", payload, fields);
        if (removeFieldsProp != null && !removeFieldsProp.isBlank()) {
            removeFields(fields, Arrays.asList(removeFieldsProp.split(",")));
        }

        long timestampNs = parseEpochNs(metadata.path("timestamp").asLong(0L));
        return buildLine(measurement, tags, fields, timestampNs);
    }
    
    public String buildLine(String measurement, Map<String, String> tags, Map<String, String> fields, Long timestampNs) {
        StringBuilder sb = new StringBuilder();
        sb.append(sanitize(measurement));
        if (tags != null && !tags.isEmpty()) {
            sb.append(',');
            boolean first = true;
            for (Map.Entry<String, String> e : tags.entrySet()) {
                if (!first) sb.append(',');
                first = false;
                sb.append(sanitize(e.getKey())).append('=').append(sanitize(e.getValue()));
            }
        }
        sb.append(' ');
        boolean firstField = true;
        for (Map.Entry<String, String> e : fields.entrySet()) {
            if (e.getValue() == null) continue;
            if (!firstField) sb.append(',');
            firstField = false;
            sb.append(sanitize(e.getKey())).append('=').append(e.getValue());
        }
        if (timestampNs != null && timestampNs > 0) {
            sb.append(' ').append(timestampNs);
        }
        return sb.toString();
    }

    /**
     * Remove fields from the flattened payload map based on provided keys or prefixes.
     * Keys are matched exactly; if a key in {@code removeKeys} ends with '*' it will be treated
     * as a prefix pattern and any field starting with that prefix will be removed.
     * Example removeKeys: ["payload.coreData.lat", "payload.J2735 Message.value.coreData.*"].
     */
    public void removeFields(Map<String, String> fields, Collection<String> removeKeys) {
        if (fields == null || fields.isEmpty() || removeKeys == null || removeKeys.isEmpty()) return;
        // Build exact and prefix patterns
        Set<String> exact = new HashSet<>();
        List<String> prefixes = new ArrayList<>();
        for (String k : removeKeys) {
            if (k == null || k.isBlank()) continue;
            if (k.endsWith("*")) {
                prefixes.add(k.substring(0, k.length() - 1));
            } else {
                exact.add(k);
            }
        }
        // Collect keys to remove to avoid concurrent modification
        List<String> toRemove = new ArrayList<>();
        for (String key : fields.keySet()) {
            if (exact.contains(key)) {
                toRemove.add(key);
                continue;
            }
            for (String p : prefixes) {
                if (!p.isEmpty() && key.startsWith(p)) {
                    toRemove.add(key);
                    break;
                }
            }
        }
        toRemove.forEach(fields::remove);
    }

    private void flatten(String prefix, JsonNode node, Map<String, String> out) {
        if (node == null || node.isMissingNode() || node.isNull()) return;
        if (node.isObject()) {
            node.fields().forEachRemaining(e -> {
                String key = prefix + "." + e.getKey();
                flatten(key, e.getValue(), out);
            });
        } else if (node.isArray()) {
            int idx = 0;
            for (JsonNode item : node) {
                String key = prefix + "[" + idx + "]";
                flatten(key, item, out);
                idx++;
            }
        } else {
            out.put(prefix, formatFieldValue(node));
        }
    }

    private String formatFieldValue(JsonNode node) {
        if (node == null || node.isNull()) return null;
        if (node.isIntegralNumber()) {
            return node.asLong() + "i";
        } else if (node.isFloatingPointNumber()) {
            return String.valueOf(node.asDouble());
        } else if (node.isBoolean()) {
            return String.valueOf(node.asBoolean());
        } else {
            String val = node.asText("");
            return '"' + escapeString(val) + '"';
        }
    }

    private long parseEpochNs(Long epochMs) {
        return epochMs * 1_000L;
    }

    private String sanitize(String s) {
        if (s == null) return "";
        return s.replace(" ", "\\ ").replace(",", "\\,").replace("=", "\\=");
    }

    private String escapeString(String s) {
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private String toCamelCase(String s) {
        if (s == null) return "";
        String[] parts = s.replaceAll("[^A-Za-z0-9]+", " ").trim().split(" ");
        if (parts.length == 0) return "";
        StringBuilder sb = new StringBuilder(parts[0].toLowerCase());
        for (int i = 1; i < parts.length; i++) {
            if (parts[i].isEmpty()) continue;
            sb.append(Character.toUpperCase(parts[i].charAt(0))).append(parts[i].substring(1).toLowerCase());
        }
        return sb.toString();
    }
}
