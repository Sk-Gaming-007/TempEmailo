# Multi-stage build for optimized production image
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm install --save-dev @tailwindcss/vite @types/node @types/react @types/react-dom @vitejs/plugin-react tailwindcss typescript vite vite-plugin-singlefile

# Copy source code
COPY . .

# Build the project
RUN npm run build

# Production stage - lightweight image
FROM node:22-alpine

WORKDIR /app

# Install serve to run the static files
RUN npm install -g serve

# Copy built dist folder from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000 || exit 1

# Start the application
CMD ["serve", "-s", "dist", "-l", "3000"]
