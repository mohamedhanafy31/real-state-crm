FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm config set fetch-retry-mintimeout 60000 \
    && npm config set fetch-retry-maxtimeout 600000 \
    && npm install

COPY . .

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

EXPOSE 5000

CMD ["npm", "run", "start"]
