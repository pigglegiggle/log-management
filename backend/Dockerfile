# ใช้ Node LTS
FROM node:20-alpine

WORKDIR /app

# Copy package.json & package-lock.json
COPY package*.json ./

RUN npm install

# ไม่ต้อง COPY source code เพราะใช้ volume mount ใน docker-compose
COPY . .

ENV PORT=3002
EXPOSE 3002

CMD ["npm", "run", "dev"]
