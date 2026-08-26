# Production-ready Dockerfile for Render.com deployment
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev for build)
RUN npm install

# Copy source code
COPY . .

# Build the project
RUN npm run build

# Install serve globally for static file serving
RUN npm install -g serve

# Expose port (Render uses $PORT environment variable)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000 || exit 1

# Start the application on port 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
