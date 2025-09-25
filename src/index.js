require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Events } = require('discord.js');
const path = require('node:path');
const fs = require('node:fs');
const http = require('http');
const MusicManager = require('./utils/musicManager');
const WebInterface = require('./web-interface');

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// Create a collection for commands
client.commands = new Collection();

// Initialize music manager
client.musicManager = new MusicManager();

// Initialize web interface
client.webInterface = new WebInterface(client);
const WEB_PORT = parseInt(process.env.WEB_PORT || '3001', 10);
client.webInterface.start(WEB_PORT);

// Load commands from the commands directory
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  
  console.log(`📁 Loading ${commandFiles.length} command(s) from commands directory...`);
  
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      console.log(`✅ Loaded command: ${command.data.name}`);
    } else {
      console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
  }
} else {
  console.log('⚠️  No commands directory found');
}

// Load events from the events directory
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
  const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
  
  console.log(`📁 Loading ${eventFiles.length} event(s) from events directory...`);
  
  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
      console.log(`✅ Loaded event: ${event.name} (once)`);
    } else {
      client.on(event.name, (...args) => event.execute(...args));
      console.log(`✅ Loaded event: ${event.name} (on)`);
    }
  }
} else {
  console.log('⚠️  No events directory found');
}

// Handle errors
client.on(Events.Error, error => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

// Create HTTP server for health checks
const server = http.createServer((req, res) => {
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      botStatus: client.isReady() ? 'online' : 'offline'
    }));
  } else if (req.url === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Discord Bot Server is running!');
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

// Start HTTP server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🌐 HTTP server listening on port ${PORT}`);
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN).catch(error => {
  console.error('Failed to login to Discord:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  server.close(() => {
    console.log('HTTP server closed');
    client.destroy();
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    console.log('HTTP server closed');
    client.destroy();
    process.exit(0);
  });
});
