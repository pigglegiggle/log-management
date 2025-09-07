# ใช้ Node LTS
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

# COPY . .

ENV PORT=3002
EXPOSE 3002

CMD ["npm", "run", "dev"]
