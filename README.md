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

- Node.js 20+
- npm
- A Discord Bot Application from the [Discord Developer Portal](https://discord.com/developers/applications)

## Development Environment Setup

This project is a monorepo containing the Node.js backend server and a React frontend client. Follow these steps to get your local development environment running.

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd discord-bot-server
```

### 2. Configure the Backend

The backend server handles all the Discord bot logic and serves the API for the web interface.

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Create Environment File:**
    Copy the example environment file. This file will hold all your secret keys and configuration variables.
    ```bash
    cp .env.example .env
    ```

3.  **Edit `.env` File:**
    Open the newly created `.env` file and fill in the variables. See the **Environment Variables** section below for a full description of each. You will need to get most of these from the Discord Developer Portal for your bot application.

    *   **Crucially, you must go to the "OAuth2" section of your Discord application and add a Redirect URI. It must exactly match your `DISCORD_CALLBACK_URL` (e.g., `http://localhost:3001/api/auth/discord/callback`).**

4.  **Deploy Slash Commands:**
    This only needs to be done once, or whenever you add or modify slash commands.
    ```bash
    npm run deploy-commands
    ```

### 3. Configure the Frontend

The frontend is a React application built with Vite that provides the web control panel.

1.  **Navigate to the client directory and install dependencies:**
    ```bash
    cd client
    npm install
    ```

2.  **Create Client Environment File:**
    The client needs to know the URL of the backend API.
    ```bash
    echo "VITE_API_BASE_URL=http://localhost:3001" > .env
    ```
    *(If you changed the `PORT` in the backend's `.env` file, make sure it matches here.)*

3.  **Return to the root directory:**
    ```bash
    cd ..
    ```

### 4. Run the Application

Start the backend server in development mode. It will watch for file changes and restart automatically.
```bash
# In your first terminal, from the project root:
npm run dev
```

In a second terminal, start the frontend React development server.
```bash
# In your second terminal, from the project root:
cd client
npm run dev
```

You should now be able to access the web interface at the URL provided by the Vite server (usually `http://localhost:5173`).

## Available Commands
## Environment Variables

| Variable                  | Description                                                                                             | Required |
| ------------------------- | ------------------------------------------------------------------------------------------------------- | -------- |
| `DISCORD_TOKEN`           | Your Discord bot token.                                                                                 | Yes      |
| `CLIENT_ID`               | Your Discord application's Client ID.                                                                   | Yes      |
| `GUILD_ID`                | The ID of your test server for instant command deployment.                                              | No       |
| `PORT`                    | The port the backend server will run on. Defaults to `3001`.                                            | No       |
| `SFX_BASE_URL`            | The base URL for your S3 bucket where sound effects are stored.                                         | No       |
| `DISCORD_CLIENT_ID`       | The Client ID from your Discord App's OAuth2 settings. (Often same as `CLIENT_ID`).                     | Yes      |
| `DISCORD_CLIENT_SECRET`   | The Client Secret from your Discord App's OAuth2 settings.                                              | Yes      |
| `DISCORD_CALLBACK_URL`    | The full URL to your authentication callback route (e.g., `http://localhost:3001/api/auth/discord/callback`). | Yes      |
| `SESSION_SECRET`          | A long, random string used to secure user sessions.                                                     | Yes      |
| `FRONTEND_URL`            | The base URL of your frontend application (e.g., `http://localhost:5173`).                              | No       |
| `CONTROLLER_ROLE_NAME`    | The exact name of the server role required to control the bot.                                          | No       |
| `OAUTH2_INVITE_URL`              | The bot's OAuth2 invite link to show to users who don't share a server with it.                           | No       |

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
