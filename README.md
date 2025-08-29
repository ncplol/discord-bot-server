# Discord Bot Server

A Discord bot server built with Node.js and discord.js, designed for easy deployment on platforms like Railway.

## Features

- 🤖 Discord.js v14.15+ integration
- 🎵 Voice channel music playback with @discordjs/voice v0.19+
- ⚡ Slash command support
- 🔧 Modular command and event system
- 🐳 Docker support for easy deployment
- 📝 Environment-based configuration
- 🌐 Web interface for remote control
- 🚀 Production-ready setup

## Prerequisites

- Node.js 20+ (recommended: Node.js 22+)
- npm or yarn
- Discord Bot Token
- Discord Application ID
- Discord Guild (Server) ID

## Tech Stack

- **Discord.js**: v14.15.0+ (Latest stable)
- **Voice Library**: @discordjs/voice v0.19.0+ (Latest stable)
- **Audio Processing**: @discordjs/opus v0.10.0+ (Latest stable)
- **Web Framework**: Express v5.1.0+ (Latest stable)
- **Audio Sources**: yt-dlp for YouTube support (via child process spawning)

## Setup

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd discord-bot-server
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Configuration
Copy the example environment file and configure your Discord bot:
```bash
cp env.example .env
```

Edit `.env` with your Discord bot credentials:
```env
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_discord_client_id_here
GUILD_ID=your_discord_guild_id_here
PORT=3000
NODE_ENV=development
```

### 4. Deploy Commands
Register slash commands with Discord:
```bash
npm run deploy-commands
```

### 5. Start the Bot
Development mode (with nodemon):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to the "Bot" section and create a bot
4. Copy the bot token to your `.env` file
5. Go to "OAuth2" > "URL Generator"
6. Select "bot" and "applications.commands" scopes
7. Select the permissions you want
8. Use the generated URL to invite the bot to your server

## Available Commands

- `/ping` - Check bot latency
- `/info` - Get bot and server information

## Docker Deployment

### Build the image
```bash
docker build -t discord-bot-server .
```

### Run the container
```bash
docker run -d \
  --name discord-bot \
  --env-file .env \
  discord-bot-server
```

### Railway Deployment
1. Connect your GitHub repository to Railway
2. Railway will automatically detect the Dockerfile
3. Set your environment variables in Railway dashboard
4. Deploy!

## Project Structure

```
discord-bot-server/
├── src/
│   ├── commands/          # Slash command definitions
│   ├── events/            # Discord event handlers
│   ├── index.js           # Main bot entry point
│   └── deploy-commands.js # Command deployment script
├── .env.example           # Environment variables template
├── .dockerignore          # Docker ignore file
├── Dockerfile             # Docker configuration
├── package.json           # Dependencies and scripts
└── README.md              # This file
```

## Development

### Adding New Commands
Create a new file in `src/commands/` following this structure:
```javascript
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('commandname')
    .setDescription('Command description'),
  async execute(interaction) {
    // Command logic here
  },
};
```

### Adding New Events
Create a new file in `src/events/` following this structure:
```javascript
const { Events } = require('discord.js');

module.exports = {
  name: Events.EventName,
  once: false, // or true for one-time events
  execute(...args) {
    // Event logic here
  },
};
```

## Scripts

- `npm start` - Start the bot in production mode
- `npm run dev` - Start the bot in development mode with nodemon
- `npm run deploy-commands` - Deploy slash commands to Discord

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DISCORD_TOKEN` | Your Discord bot token | Yes |
| `CLIENT_ID` | Your Discord application ID | Yes |
| `GUILD_ID` | Your Discord server ID | Yes |
| `PORT` | Server port (for health checks) | No |
| `NODE_ENV` | Environment (development/production) | No |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

If you encounter any issues or have questions, please open an issue on GitHub.
