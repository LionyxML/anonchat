# Server Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package.json .
COPY package-lock.json .

RUN npm install

COPY . .

RUN npm run server:build

EXPOSE 6969

CMD ["npm", "run", "server:start"]
