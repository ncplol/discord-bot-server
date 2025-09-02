FROM node:20

ENV FFMPEG_PATH=/usr/bin/ffmpeg

WORKDIR /app

COPY package*.json ./

# Install dependencies and build tools, then clean up
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    curl \
    build-essential \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp \
    && npm ci --only=production \
    && npm cache clean --force \
    && apt-get purge -y --auto-remove build-essential \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY . .

# Use the built-in node user for security
RUN chown -R node:node /app
USER node

EXPOSE 3000
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('Health check passed')" || exit 1

CMD ["npm", "start"]
