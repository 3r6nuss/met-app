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

# Build the frontend (disable linting errors)
ENV DISABLE_ESLINT_PLUGIN=true
RUN npm run build

# Expose the port
EXPOSE 3001

# Start the server
CMD ["node", "server.js"]
