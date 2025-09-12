# FROM node:20-alpine

# WORKDIR /app

# COPY package*.json ./

# RUN npm install

# COPY . .

# ENV NODE_ENV=production
# ENV PORT=3002

# EXPOSE 3002

# CMD ["node", "index.js"]

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Development configuration
ENV NODE_ENV=development
ENV PORT=3002

EXPOSE 3002

# Run in development mode with nodemon for auto-restart
CMD ["npx", "nodemon", "index.js"]


