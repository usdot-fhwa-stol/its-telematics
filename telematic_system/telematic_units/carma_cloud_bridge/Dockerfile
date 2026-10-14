FROM python:3.9

RUN set -xe \
    && apt-get update \
    && apt-get install -y \
    iputils-ping \
    git \
    vim \
    python3-pip
    
COPY requirements.txt /tmp
WORKDIR /tmp
RUN pip3 install --upgrade -r requirements.txt

WORKDIR /ws

ADD cloud_nats_bridge src/cloud_nats_bridge

RUN useradd --create-home --shell /bin/bash app && \
    chown -R app:app /ws

USER app

WORKDIR /ws/src/cloud_nats_bridge/src/cloud_nats_bridge

CMD [ "python", "-u", "main.py" ]
