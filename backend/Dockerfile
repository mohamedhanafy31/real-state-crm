FROM node:20

WORKDIR /app

COPY package*.json ./

RUN npm config set fetch-retry-mintimeout 60000 \
    && npm config set fetch-retry-maxtimeout 600000 \
    && npm install

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
