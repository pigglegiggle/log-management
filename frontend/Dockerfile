# FROM node:20-alpine AS base

# FROM base AS builder
# WORKDIR /app

# # Install dependencies
# COPY package.json ./
# RUN npm install --no-audit --no-fund

# # Copy source and build
# COPY . .
# RUN npm run build

# # Debug: Check build output
# RUN ls -la .next/ && ls -la .next/server/ || echo "Build failed or incomplete"


# FROM base AS runner
# WORKDIR /app

# # Copy package.json and install production dependencies
# COPY --from=builder /app/package.json ./
# RUN npm install --omit=dev --no-audit --no-fund

# # Copy built application
# COPY --from=builder /app/.next ./.next
# COPY --from=builder /app/public ./public

# # Debug: Check copied files
# RUN ls -la .next/ && ls -la .next/server/ || echo "Copy failed or incomplete"

# ENV NODE_ENV=production
# ENV PORT=3001
# EXPOSE 3001

# CMD ["npm", "start"]


FROM node:20-alpine AS base

FROM base AS builder
WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install --no-audit --no-fund

# Copy source for development
COPY . .

# Development configuration
ENV NODE_ENV=development
ENV PORT=3001
EXPOSE 3001

# Run in development mode
CMD ["npm", "run", "dev"]