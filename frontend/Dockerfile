FROM node:20-slim AS base

FROM base AS builder
WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# Verify build output
RUN ls -la .next/

FROM base AS runner
WORKDIR /app

# Copy package.json and install production dependencies
COPY --from=builder /app/package.json ./
RUN npm install --only=production

# Copy built application
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Verify copied files
RUN ls -la .next/

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

CMD ["npm", "start"]