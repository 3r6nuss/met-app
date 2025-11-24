# Use Node.js as the base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy pre-built dist folder and server file
COPY dist ./dist
COPY server.js ./
COPY src/data ./src/data

# Expose the port
EXPOSE 3001

# Start the server
CMD ["node", "server.js"]
