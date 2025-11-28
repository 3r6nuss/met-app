# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev

# Copy pre-built dist folder from builder
COPY --from=builder /app/dist ./dist

# Copy backend files
COPY server.js ./
COPY src/data ./src/data
COPY src/db ./src/db
COPY scripts ./scripts

# Expose the port
EXPOSE 3001

# Start the server
CMD ["node", "server.js"]
