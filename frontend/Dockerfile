# Build stage
FROM node:18-alpine as build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build for production
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration template
COPY nginx.conf.template /etc/nginx/conf.d/default.conf.template

# Expose port (Cloud Run ignores this, but good for documentation)
EXPOSE 8080

# Health check (update port if needed, but localhost is internal)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:${PORT:-8080}/health || exit 1

# Start nginx with env variable substitution (default PORT=80 for local, Cloud Run overrides to 8080)
# Start nginx with env variable substitution (default PORT=80 for local, Cloud Run overrides to 8080)
# Also inject BACKEND_URL for API proxying
CMD /bin/sh -c "export PORT=\${PORT:-80} && export BACKEND_URL=\${BACKEND_URL:-http://dysarthria-backend:8000} && envsubst '\$PORT \$BACKEND_URL' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"
