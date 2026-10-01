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

Run the deployment initialization from the repository root by selecting the
environment, target, and use case.

For the core use case:

```bash
./deployment/scripts/deploy.sh \
  --environment dev \
  --target on-premise \
  --use-case core
For the RSU integration use case:

./deployment/scripts/deploy.sh \
  --environment dev \
  --target on-premise \
  --use-case rsu_integration
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

