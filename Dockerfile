# --- Stage 1: Build Stage ---
FROM node:20 AS builder

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy all package manager files for a workspace install
COPY pnpm-lock.yaml ./
COPY package.json ./
COPY client/package.json ./client/
COPY pnpm-workspace.yaml ./

# Install all dependencies for both projects
RUN pnpm install --frozen-lockfile

# Copy the rest of the source code
COPY . .

# Build the client application
RUN pnpm --filter client run build


# --- Stage 2: Production Stage ---
FROM node:20

WORKDIR /home/node/app

# Install pnpm
RUN npm install -g pnpm

# Install necessary runtime dependencies like ffmpeg and yt-dlp
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    curl \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy package files from the builder stage
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./

# Install ONLY production dependencies for the server
RUN pnpm install --prod --frozen-lockfile

# Copy the server source code from the builder stage
COPY --from=builder /app/src ./src

# Copy the built client from the builder stage
COPY --from=builder /app/client/dist ./src/public

# Set a non-root user
RUN chown -R node:node /home/node/app
USER node

# Expose port
EXPOSE 3001

# Set FFMPEG_PATH environment variable
ENV FFMPEG_PATH=/usr/bin/ffmpeg

# Start the bot
CMD ["pnpm", "start"]
