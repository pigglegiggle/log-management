# ใช้ Node LTS
FROM node:20-alpine

WORKDIR /app

# Copy package.json & package-lock.json
COPY package*.json ./

RUN npm install

# Copy source code
COPY . .

ENV NODE_ENV=development
ENV PORT=3001
EXPOSE 3001

CMD ["npm", "run", "dev", "--", "-p", "3001"]
