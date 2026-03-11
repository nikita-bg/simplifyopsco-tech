FROM node:20-alpine
RUN apk add --no-cache openssl

EXPOSE 8080

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm ci && npm cache clean --force

COPY . .

RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production
ENV PORT=8080

CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
