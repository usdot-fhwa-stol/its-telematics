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

## Install docker-compose 
```
# get latest docker compose released tag
COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)

# Install docker-compose
sudo curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Output compose version
docker-compose -v

```

## Launch influxDB container with docker-compose
```
# navigate to a folder where the docker-compose file is located, and check the influxDB service is located in this docker-compose file
cd <directory name>/telematic_system

# rename the telematic.env file to .env
mv telematic.env .env

# Docker compose up to launch container
 docker-compose -f docker-compose.cloud.servers.yml up -d
 docker-compose -f docker-compose.dbs.yml up -d
 docker-compose -f docker-compose.units.yml up -d

# Shutdown container
docker-compose -f docker-compose.cloud.servers.yml down
docker-compose -f docker-compose.dbs.yml down
docker-compose -f docker-compose.units.yml down
```

## Secrets 
#### influxDB v3
Sample secrets secrets/influx_admin_token.txt.example

#### Grafana
Sample secrets secrets/grafana_secret_key.txt.example
Note: Grafana uses MYSQL database and share the same secrets as the MYSQL secrets.

#### MYSQL
Sample secrets secrets/mysql_root_password.txt.example
Sample secrets secrets/mysql_password.txt.example

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

