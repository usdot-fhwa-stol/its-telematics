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

Run `./deployment/scripts/deploy.py` from the repository root for input selection,
local setup, configuration layering, and runtime `.env` generation.

Supported CLI values:

| Option | Supported values | Default |
| --- | --- | --- |
| `--environment` | `dev`, `test`, `prod` | `prod` |
| `--target` | `localhost`, `remote`, `cloud` | `localhost` |
| `--use-case` | `messaging`, `rsu_management` | Optional; omitted enables all services |

Environment selection:

- `dev`: development images.
- `test`: test/release-validation images.
- `prod`: production deployment profile.

The environment profile files under `deployment/environment/` remain the source
of truth for Docker organization and image tag selection.

Before running localhost initialization, understand that `local.setup.sh`
modifies `/etc/hosts` and deletes and recreates `/opt/grafana`, `/opt/apache2`,
and `/opt/influxdb2`, discarding existing data in those directories. It also
creates `/opt/telematics/upload` as needed and changes permissions under
`/opt/telematics`. Localhost initialization runs this setup automatically.

Default localhost initialization with all services enabled:

```bash
./deployment/scripts/deploy.py
```

Messaging:

```bash
./deployment/scripts/deploy.py \
  --environment dev \
  --target localhost \
  --use-case messaging
```

RSU management:

```bash
./deployment/scripts/deploy.py \
  --environment dev \
  --target localhost \
  --use-case rsu_management
```

Remote configuration preparation (replace the placeholders):

```bash
./deployment/scripts/deploy.py \
  --environment dev \
  --target remote \
  --remote-io '<host>' \
  --remote-user '<user>' \
  --key-path '<path>'
```

The remote target requires `--remote-io` and `--remote-user`. An optional
`--key-path` must name an existing readable file. Remote/cloud execution and
provisioning will be completed by the follow-up automation/Ansible work; this
story prepares configuration and connection metadata only. These targets do
not install dependencies or run local setup on the operator's machine. The current
`cloud` configuration represents the AWS-oriented deployment path in the design.

For `localhost`, initialization checks supported host prerequisites (Ubuntu or
Debian, required executable scripts, and root or sudo availability), then uses
`deployment/scripts/install_dependencies.sh` to install missing Docker Engine
and Docker Compose dependencies. It runs `telematic_system/local.setup.sh` with
root privileges, verifies Docker daemon access and Compose availability, and
generates `telematic_system/.env`.

`telematic_system/sample.env` is the base runtime configuration layer.
Environment, target, and selected use-case layers are applied afterward to
produce the consolidated `telematic_system/.env`, the Docker Compose runtime
environment file. When the use case is omitted, both use-case layers are loaded
and `COMPOSE_PROFILES=messaging,rsu_integration` enables all services.
The `messaging` use case uses the existing `core` configuration layer. The
`rsu_management` use case uses the existing `rsu_integration` configuration layer
and activates its Docker Compose profile.
Initialization prepares the runtime configuration; it does not start the stack.
`ManifestReference` is temporary, in-memory metadata describing the runtime
`.env` and Compose paths. It is printed as JSON; no deployment YAML manifest is
generated.

## Secrets

Deployment initialization prepares all four mandatory secret artifacts,
regardless of the selected use case:

| Secret key | Generated file | Example default |
| --- | --- | --- |
| `mysql_password` | `secrets/mysql_password.txt` | `secrets/mysql_password.txt.example` |
| `mysql_root_password` | `secrets/mysql_root_password.txt` | `secrets/mysql_root_password.txt.example` |
| `grafana_secret_key` | `secrets/grafana_secret_key.txt` | `secrets/grafana_secret_key.txt.example` |
| `influx_admin_token` | `secrets/influx_admin_token.txt` | `secrets/influx_admin_token.txt.example` |

These paths are relative to `telematic_system/`. Each initialization creates or
refreshes each secret file using a non-empty `--secret-override` value first,
then the corresponding non-empty `.example` file. If neither is available,
initialization fails with a diagnostic identifying the expected example file
and override option. Existing generated secret files are not a fallback.

For example, from the repository root:

```bash
./deployment/scripts/deploy.py \
  --secret-override mysql_password='<value>'
```

`--secret-override` may be repeated for multiple secrets; repeated keys use the
last supplied value. Secret values are not printed in deployment logs. Generated
secret files have permissions `600` and are gitignored; example files remain
tracked.

#### MYSQL
`mysql_password.txt` and `mysql_root_password.txt` set the user and root passwords
on the mysqldb container's first start. The resolved `mysql_password` credential
is used for both the MySQL secret artifact and the runtime `MYSQL_PASSWORD` value.
This initialization process does not rotate credentials already stored in an
initialized or running database.

#### influxDB v3
`influx_admin_token.txt` is required by the `rsu_integration` profile and holds the
admin token as JSON:
```
{"name":"dev-admin","token":"apiv3_YOUR_ADMIN_TOKEN_VALUE","hashed":false,"description":"dev-admin"}
```
The token value must match `rsu_data_ingestion_influx_token` in the generated `.env`.
An Influx override is written verbatim and must supply the expected JSON document;
the configuration service does not validate that format or synchronize the RSU
ingestion token.

#### Grafana secret key

`grafana_secret_key.txt` is generated, but the current Compose configuration does
not mount or reference it in Grafana.

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
