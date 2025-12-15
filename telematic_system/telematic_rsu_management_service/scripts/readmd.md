```

influxdb3 show databases --token apiv3_YOUR_ADMIN_TOKEN_VALUE
curl "http://localhost:8181/api/v3/configure/database" \
  --header "Authorization: Bearer apiv3_YOUR_ADMIN_TOKEN_VALUE"

influxdb3 create database \
  --token apiv3_YOUR_ADMIN_TOKEN_VALUE \
  --retention-period 30d \
  rsu_data

influxdb3 show databases \
    --token apiv3_YOUR_ADMIN_TOKEN_VALUE 

influxdb3 query --token apiv3_YOUR_ADMIN_TOKEN_VALUE --database rsu_data "SELECT 1"


influxdb3 query \
  --database rsu_data \
  --token apiv3_YOUR_ADMIN_TOKEN_VALUE \
  "SHOW TABLES"

influxdb3 query \
  --database rsu_data \
  --token apiv3_YOUR_ADMIN_TOKEN_VALUE \
  "describe sensor"

influxdb3 query \
  --database rsu_data \
  --token apiv3_YOUR_ADMIN_TOKEN_VALUE \
  "SELECT COUNT(*) FROM 'test_event'"
```

```
curl -s -X POST "http://localhost:8181/api/v3/configure/database?format=json" -H "Authorization: Bearer apiv3_YOUR_ADMIN_TOKEN_VALUE" -H "Content-Type: application/json" -d '{"db":"rsu_data","retention_period":"30d"}'
  

curl --request GET "http://localhost:8181/api/v3/configure/database?format=json" \
  --header "Authorization: Bearer apiv3_YOUR_ADMIN_TOKEN_VALUE"

curl -s -X POST "http://localhost:8181/api/v3/query_sql" -H "Authorization: Bearer apiv3_YOUR_ADMIN_TOKEN_VALUE" -H "Content-Type: application/json" -d '{"db":"rsu_data","q":"SELECT 1"}'

# Create a table with tag and field columns
curl -X POST "http://localhost:8181/api/v3/configure/table" \
  --header "Authorization: Bearer apiv3_YOUR_ADMIN_TOKEN_VALUE" \
  --header "Content-Type: application/json" \
  --data '{
    "db": "rsu_data",
    "table": "sensor",
    "tags": ["room", "sensor_id"],
    "fields": [
      {"name": "temp", "type": "float64"},
      {"name": "hum", "type": "float64"},
      {"name": "co", "type": "int64"}
    ]
  }'

curl -G "http://localhost:8181/api/v3/query_sql" \
  --header "Authorization: Bearer apiv3_YOUR_ADMIN_TOKEN_VALUE" \
  --data-urlencode "db=rsu_data" \
  --data-urlencode 'q=SELECT * FROM "test_event" WHERE "payload.J2735Message.messageId" = '\''BSM'\''' \
  --data-urlencode "format=jsonl"


curl -G "http://localhost:8181/api/v3/query_sql" \
  --header "Authorization: Bearer apiv3_YOUR_ADMIN_TOKEN_VALUE" \
  --data-urlencode "db=rsu_data_test" \
  --data-urlencode "q=SELECT COUNT(*) FROM 'test_event'" \
  --data-urlencode "format=jsonl"

```