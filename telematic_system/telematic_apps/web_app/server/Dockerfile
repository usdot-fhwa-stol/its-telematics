FROM node:20.11.1-alpine

# Create app directory
WORKDIR /app

#A wildcard is used to ensure both package.json AND package-lock.json are copied where available 
COPY package*.json ./

RUN apk add --no-cache bash dos2unix python3 make g++

RUN printf '#!/bin/sh\nif [ "$1" = "-t" ]; then shift; fi\nexec /usr/bin/timeout "$@"\n' > /usr/local/bin/timeout \
    && chmod +x /usr/local/bin/timeout

RUN npm install --ignore-scripts -g nodemon node-wait-for-it && \
    npm install --ignore-scripts && \
    npm rebuild bcrypt --build-from-source && \
    npm cache clean --force

COPY . .
RUN dos2unix service.sh && chmod +x service.sh && chown -R node:node /app

USER node
CMD ["/bin/sh", "-c", "/app/service.sh"]