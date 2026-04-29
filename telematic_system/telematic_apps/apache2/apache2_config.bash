#!/usr/bin/env bash
if [ -d "/opt/apache2" ]
then
    echo "Directory /opt/apache2 exists."
    rm -R /opt/apache2
else
    echo "Directory /opt/apache2 does not exist."
    mkdir -p /opt/apache2
fi
sudo chmod 777 -R /opt/apache2

# Grafana Configuration file
touch /opt/apache2/grafana_htpasswd
echo "Copy grafana_htpasswd to directory /opt/apache2."

sudo chmod 777 -R /opt/apache2
echo "Directory /opt/apache2 permission 777."