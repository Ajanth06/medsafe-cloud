# AARYX 24/7 operations worker (market + news + alerts pipeline)
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV NODE_ENV=production

CMD ["npm", "run", "mi:worker"]
