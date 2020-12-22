### STAGE 1: Build ###

FROM node:14.15.0-alpine as build

WORKDIR "/app"
COPY ["package.json", "package-lock.json", "./"]

## install npm packages
RUN npm ci

## copy to workdir
COPY . .

## compile typescript
RUN npm run build

## remove packages of devDependencies
RUN npm prune --production




### STAGE 2: Rund ###
FROM node:14.15.0-alpine

WORKDIR "/app"

## Copy the necessary files form builder
COPY --from=build "/app/dist/" "/app/dist/"
COPY --from=build "/app/node_modules/" "/app/node_modules/"
COPY --from=build "/app/package.json" "/app/package.json"

CMD ["npm", "run", "start:dist"]
