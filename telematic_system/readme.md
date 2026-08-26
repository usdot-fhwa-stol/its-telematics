## Login to redhat
```
chmod 400 <pem file name>
ssh -i "<pem file name>" ec2-user@<amazone ec2 instance url>
```

## Install docker
```
# Install docker
sudo yum install docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Output compose version
docker -v
```


## Launch
`initialization.sh` prompts for environment (dev/test/prod), target (on-premise/cloud)
and use case (core/rsu_integration), then writes `.env` from the matching layers under
`deployment/`. On on-premise it also offers to run `local.setup.sh`.
```
cd <directory name>/telematic_system
./initialization.sh

# All services on one host
docker compose up -d
docker compose down
```

Add the RSU Management Service and InfluxDB v3:
```
docker compose --profile rsu_integration up -d
```

Across separate hosts, run only the tier each host needs. Set the other hosts'
addresses in `deployment/targets/<target>/.env` before running `initialization.sh`.
```
docker compose -f docker-compose.core.yml up -d    # nats, messaging server, rosbag2 processing
docker compose -f docker-compose.dbs.yml up -d     # mysql, influxdb
docker compose -f docker-compose.webapp.yml up -d  # web server/client, apache2, grafana
docker compose -f docker-compose.units.yml up -d   # ros2, kafka and cloud bridges
docker compose -f docker-compose.rsu.yml --profile rsu_integration up -d
```

## Secrets
Everything in `secrets/` is gitignored except the `*.example` files. Copy each one
and replace the placeholder before starting the stack:
```
cd telematic_system/secrets
cp mysql_password.txt.example mysql_password.txt            # password for MYSQL_USER
cp mysql_root_password.txt.example mysql_root_password.txt  # MySQL root password
cp grafana_secret_key.txt.example grafana_secret_key.txt    # Grafana GF_SECURITY_SECRET_KEY
cp influx_admin_token.txt.example influx_admin_token.txt    # rsu_integration profile only
```

#### MYSQL
`mysql_password.txt` and `mysql_root_password.txt` set the user and root passwords
on the mysqldb container's first start. Grafana connects to the same database with
`mysql_password`, so keep it in sync with `MYSQL_PASSWORD` in the generated `.env`.

#### influxDB v3
`influx_admin_token.txt` is required by the `rsu_integration` profile and holds the
admin token as JSON:
```
{"name":"dev-admin","token":"apiv3_YOUR_ADMIN_TOKEN_VALUE","hashed":false,"description":"dev-admin"}
```
The token value must match `rsu_data_ingestion_influx_token` in the generated `.env`.

## Open a browser to view influxDB UI
http://<amazone ec2 instance url>:8086/orgs/04cb75631ee68b28

## Test telematic cloud server apis with CURL commands
- Check API service health status
```
    curl -X GET-v http://localhost:8080/healthz
```

- Check worker health status
```
    curl -X GET-v http://localhost:8181/healthz
```

- Get all available topics (JAVA version)
```
	curl -X GET -v http://localhost:8080/requestAvailableTopics/<unit_id>
```

- Get all available topics (Go version)
```
	curl -X GET-v http://localhost:8080/requestAvailableTopics?unit_id=<unit_id>
```

- Request data for a list of selected topics  (Go version)
```
	curl -d '{"unit_id": "<unit_id>", "unit_type": "<unit_type>", "timestamp": 1663084528513000325, "topics": ["<topic_name_1>","<topic_name_2>"]}'  -H "Content-Type: application/json" -X POST -v http://localhost:8080/publishSelectedTopics
```


# CARMA vehicle bridge
## Update cycloneDDS config to port to host machine network interface
```
<?xml version="1.0" encoding="UTF-8" ?>
 <CycloneDDS xmlns="https://cdds.io/config" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="https://cdds.io/config https://raw.githubusercontent.com/eclipse-cyclonedds/cyclonedds/master/etc/cyclonedds.xsd">
   <Domain id="any">
       <General>
            <NetworkInterfaceAddress>ens33</NetworkInterfaceAddress>
        </General>
    </Domain>
</CycloneDDS>
```
Update the NetworkInterfaceAddress to the machine that used to run carma_vehicle_bridge


- Request data for a list of selected topics (Java version)
```
	curl -d '{"unit_id": "<unit_id>", "unit_type": "<unit_type>", "timestamp": 1663084528513000325, "topics": ["<topic_name_1>","<topic_name_2>"]}'  -H "Content-Type: application/json" -X POST -v http://localhost:8080/requestSelectedTopics
```

3. get list of registered units:
	```
	curl -X GET -v http://localhost:8080/registeredUnits

	```

