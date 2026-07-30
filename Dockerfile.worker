# AARYX 24/7 operations worker (market + news + alerts pipeline)
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
# npm install (not ci): lockfile may lag package.json slightly
RUN npm install

COPY . .

ENV NODE_ENV=production

CMD ["npm", "run", "mi:worker"]
