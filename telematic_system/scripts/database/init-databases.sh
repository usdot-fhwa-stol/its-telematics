#!/bin/bash
mysql -u root -p"$(cat /run/secrets/mysql_root_password)" <<-EOSQL
    CREATE DATABASE IF NOT EXISTS rsm;
    CREATE DATABASE IF NOT EXISTS wfd_grafana;
    GRANT ALL PRIVILEGES ON rsm.* TO 'telematic'@'%';
    GRANT ALL PRIVILEGES ON wfd_grafana.* TO 'telematic'@'%';
    FLUSH PRIVILEGES;
EOSQL