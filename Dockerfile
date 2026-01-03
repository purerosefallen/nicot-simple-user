FROM node:lts-trixie-slim as base
LABEL Author="Nanahira <nanahira@momobako.com>"

RUN apt update && apt -y install python3 build-essential libpq-dev && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* /var/log/*

WORKDIR /usr/src/app
COPY ./package*.json ./

FROM base as builder
RUN npm ci && npm cache clean --force
COPY . ./
RUN npm run build

FROM base
RUN npm ci && npm i pg-native && npm cache clean --force
COPY --from=builder /usr/src/app/dist ./dist
COPY ./config.example.yaml ./config.yaml

ENV NODE_PG_FORCE_NATIVE=true
EXPOSE 3000
CMD [ "npm", "run", "start:prod" ]
