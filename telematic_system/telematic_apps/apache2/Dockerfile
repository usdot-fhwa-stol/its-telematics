FROM ubuntu/apache2:2.4-22.04_stable
RUN a2enmod proxy
RUN a2enmod rewrite
RUN a2enmod proxy_balancer
RUN a2enmod proxy_http
RUN a2enmod headers
RUN a2enmod lua
RUN mkdir -p /etc/apache2/lua
RUN touch /etc/apache2/grafana_htpasswd
RUN chmod 777 /etc/apache2/grafana_htpasswd
COPY ports.conf /etc/apache2/ports.conf
COPY 000-default.conf /etc/apache2/sites-available/000-default.conf
COPY 000-default.conf /etc/apache2/sites-enabled/000-default.conf
COPY grafana_auth.lua /etc/apache2/lua/grafana_auth.lua
