# --- Stage 1: Build the React Frontend ---
FROM node:20 AS client-builder

WORKDIR /app
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# --- Stage 2: Build the Node.js Backend ---
FROM node:20

# Set a non-root user and create app directory
RUN mkdir -p /home/node/app && chown -R node:node /home/node/app
WORKDIR /home/node/app
USER node

# Copy backend package files and install dependencies
COPY --chown=node:node package*.json ./
RUN npm ci --only=production

# Install necessary runtime dependencies
USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    curl \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*
USER node

# Copy the rest of the backend source code
COPY --chown=node:node . .

# Copy the built React app from the builder stage
COPY --chown=node:node --from=client-builder /app/dist ./src/public

# Expose ports
EXPOSE 3000
EXPOSE 3001

# Set FFMPEG_PATH environment variable
ENV FFMPEG_PATH=/usr/bin/ffmpeg

# Start the bot
CMD ["npm", "start"]
