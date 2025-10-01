# --- Stage 1: Build Stage ---
FROM node:20-slim AS builder

# Add labels for better container management
LABEL maintainer="discord-bot-server"
LABEL version="1.0.0"
LABEL description="Discord Bot Server - Build Stage"

# Install system dependencies needed for building native modules
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-dev \
    build-essential \
    pkg-config \
    libopus-dev \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm globally (only needed in builder stage)
RUN npm install -g pnpm@latest

# Set working directory
WORKDIR /app

# Copy package manager files first for better layer caching
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
COPY client/package.json ./client/

# Install all dependencies for both projects
RUN pnpm install --frozen-lockfile

# Copy source code after dependencies are installed
COPY . .

# Build the client application
RUN pnpm --filter client run build

# --- Stage 2: Production Stage ---
FROM node:20-slim

# Add labels for better container management
LABEL maintainer="discord-bot-server"
LABEL version="1.0.0"
LABEL description="Discord Bot Server - Production Stage"

# Set working directory
WORKDIR /home/node/app

# Install system dependencies in a single layer for better caching
# Install pnpm, runtime dependencies, and build tools together
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python3-dev \
    curl \
    ca-certificates \
    build-essential \
    pkg-config \
    libopus-dev \
    libffi-dev \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/download/2024.10.07/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp \
    && npm install -g pnpm@latest \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy package files from builder stage for dependency installation
COPY --from=builder /app/pnpm-lock.yaml /app/package.json /app/pnpm-workspace.yaml ./

# Install ONLY production dependencies for the server
RUN pnpm install --prod --frozen-lockfile

# Copy server source code from builder stage
COPY --from=builder /app/src ./src

# Copy the built client from builder stage
COPY --from=builder /app/client/dist ./src/public

# Create logs directory and set proper ownership
RUN mkdir -p /home/node/app/logs && chown -R node:node /home/node/app

# Set non-root user for security
USER node

# Expose port
EXPOSE 3001

# Set essential environment variables
ENV NODE_ENV=production
ENV FFMPEG_PATH=/usr/bin/ffmpeg
ENV PORT=3000
ENV WEB_PORT=3001

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start the bot with proper error handling
CMD ["pnpm", "start"]
