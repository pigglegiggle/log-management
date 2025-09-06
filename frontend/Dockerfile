# ใช้ Node LTS
FROM node:20-alpine

WORKDIR /app

# Copy package.json & package-lock.json
COPY package*.json ./

RUN npm install

# ไม่ต้อง COPY โค้ด เพราะจะใช้ volume mount
COPY . .

ENV PORT=3001
EXPOSE 3001

CMD ["npm", "run", "dev", "--", "-p", "3001"]
