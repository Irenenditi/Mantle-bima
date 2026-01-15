# Use Node.js LTS version
FROM node:18-alpine

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev dependencies for TypeScript build)
RUN npm ci

# Copy source files
COPY src ./src

# Build TypeScript
RUN npm run build

# Create unified storage directory
RUN mkdir -p /app/storage/data /app/storage/uploads/images /app/storage/uploads/documents

# Expose port
EXPOSE 5000

# Start the application
CMD ["node", "dist/server.js"]
