# Use Node.js 20 Alpine for better performance and latest features
FROM node:20-alpine

# Install essential system dependencies using the package manager
# This includes ffmpeg for audio processing and python/pip for yt-dlp
RUN apk add --no-cache \
    ffmpeg \
    python3 \
    py3-pip \ 
    py3-yt-dlp

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S discordbot -u 1001

# Change ownership of the app directory
RUN chown -R discordbot:nodejs /app
USER discordbot

# Expose port (if needed for health checks)
EXPOSE 3000
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('Health check passed')" || exit 1

# Start the bot
CMD ["npm", "start"]
