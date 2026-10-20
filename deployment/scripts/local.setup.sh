#!/bin/bash
# It is assumed that the following host names are set:
#   grafana.local.cav-telematics.com: It is used for Grafana.
#   local.cav-telematics.com: It is used for the UI front end.
#   local.topic-service.cav-telematics.com: It is used for the messaging services.
#   local.ui-service.cav-telematics.com: It is used for the UI backend services.
domain_name_arr=("127.0.0.1 grafana.local.cav-telematics.com"  "127.0.0.1 local.cav-telematics.com"  "127.0.0.1 topic-service.local.cav-telematics.com" "127.0.0.1 ui-service.local.cav-telematics.com" "127.0.0.1 ui-upload-service.local.cav-telematics.com")

for domain_name in "${domain_name_arr[@]}";
do
  grep -wq "$domain_name" /etc/hosts
  if grep -wq "$domain_name" /etc/hosts; then 
      echo  "$domain_name Exists"
  else 
      echo "$domain_name Does not exist. Add."
      echo $domain_name >> /etc/hosts
  fi
done

if [ -d /opt/grafana ]; then
  echo "Directory /opt/grafana exists. Remove existing folder."
  rm -R /opt/grafana
fi

mkdir /opt/grafana
mkdir /opt/grafana/logs
mkdir /opt/grafana/data
mkdir /opt/grafana/provisioning
chmod 777 -R /opt/grafana

if [ -f /opt/apache2/grafana_htpasswd ]; then
  echo "File /opt/apache2/grafana_htpasswd exists. Remove existing file."
  rm /opt/apache2/grafana_htpasswd
fi

if [ -d /opt/apache2 ]; then
  echo "Directory /opt/apache2 exists. Remove existing folder."
  rm -R /opt/apache2
fi

mkdir /opt/apache2
touch /opt/apache2/grafana_htpasswd
chmod 777 -R /opt/apache2


if [ -d /opt/influxdb2 ]; then
  echo "Directory /opt/influxdb2 exists. Remove existing folder."
  rm -R /opt/influxdb2
fi

mkdir /opt/influxdb2
mkdir /opt/influxdb2/data
chmod 777 -R /opt/influxdb2

mkdir -p /opt/telematics/upload
chmod 777 -R /opt/telematics
