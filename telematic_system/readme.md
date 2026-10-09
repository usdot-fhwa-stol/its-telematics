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


## Deployment initialization

Run `./deployment/scripts/setup.py` from the repository root to validate
deployment inputs and generate the runtime configuration.

| Option | Supported values | Default |
| --- | --- | --- |
| `--environment` | `dev`, `test`, `prod` | `prod` |
| `--target` | `localhost`, `remote`, `cloud` | `localhost` |
| `--use-case` | `all`, `core`, `rsu_integration` | `all` |

Before running localhost initialization, understand that `local.setup.sh`
modifies `/etc/hosts` and deletes and recreates `/opt/grafana`, `/opt/apache2`,
and `/opt/influxdb2`, discarding existing data in those directories. It also
creates `/opt/telematics/upload` as needed and changes permissions under
`/opt/telematics`. Localhost initialization runs this setup automatically.

```bash
./deployment/scripts/setup.py
```

Core services:
```bash
./deployment/scripts/setup.py --use-case core
```

RSU integration:
```bash
./deployment/scripts/setup.py --use-case rsu_integration
```

For `localhost`, initialization requires Ubuntu or Debian and root or sudo,
runs `deployment/scripts/local.setup.sh`, and verifies Docker daemon access and
Docker Compose availability. Docker Engine and Docker Compose must already be
available on the host.

Initialization generates `telematic_system/.env` from `sample.env` and the
selected environment, target, and use-case layers under `deployment/`.
Omitting `--use-case` or using `--use-case all` loads both `core` and
`rsu_integration` layers and sets `COMPOSE_PROFILES=messaging,rsu_integration`.
It does not start the stack or provision remote/cloud hosts. The `remote` target
requires `--remote-io` and `--remote-user`; optional `--key-path` must identify
an existing readable file.

```
cd <directory name>/telematic_system

# All services on one host
docker compose up -d
docker compose down
```

Add the RSU Management Service and InfluxDB v3:
```
docker compose --profile rsu_integration up -d
```

Across separate hosts, run only the tier each host needs. Set the other hosts'
addresses in the applicable configuration under `deployment/targets/` before
running `setup.py`.
```
docker compose -f docker-compose.core.yml up -d    # nats, messaging server, rosbag2 processing
docker compose -f docker-compose.dbs.yml up -d     # mysql, influxdb
docker compose -f docker-compose.webapp.yml up -d  # web server/client, apache2, grafana
docker compose -f docker-compose.units.yml up -d   # ros2, kafka and cloud bridges
docker compose -f docker-compose.rsu.yml --profile rsu_integration up -d
```

## Secrets
Everything in `secrets/` is gitignored except the `*.example` files.
Initialization creates or overwrites `mysql_password.txt`, `mysql_root_password.txt`,
`grafana_secret_key.txt`, and `influx_admin_token.txt` for every use case, using
non-empty `--secret-override key=value` values or the corresponding `.example`
files. Existing secret files are not used as defaults; missing or empty sources
cause initialization to fail. Replace example placeholders before initialization
or supply overrides (repeat the option for multiple secrets):
```bash
./deployment/scripts/setup.py --secret-override mysql_password='<value>'
```

Generated secret files use mode `644` so container users can read them; they are
also readable by other host users. The generated `.env` keeps mode `600`.

#### MYSQL
`mysql_password.txt` and `mysql_root_password.txt` set the user and root passwords
on the mysqldb container's first start. Initialization uses the resolved `mysql_password` value for both
`mysql_password.txt` and `MYSQL_PASSWORD` in the generated `.env`.

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
