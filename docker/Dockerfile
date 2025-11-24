# Use Node.js as the base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the frontend (disable strict mode for CI)
ENV CI=false
ENV DISABLE_ESLINT_PLUGIN=true
RUN npm run build || (cat /root/.npm/_logs/*.log && exit 1)

# Expose the port
EXPOSE 3001

# Start the server
CMD ["node", "server.js"]
