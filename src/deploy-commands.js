require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    if ('data' in command) {
      commands.push(command.data.toJSON());
    } else {
      console.log(`[WARNING] The command at ${filePath} is missing a required "data" property.`);
    }
  }
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

// Deploy commands
(async () => {
  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    // Check if we have a guild ID for development, otherwise deploy globally
    if (process.env.GUILD_ID) {
      console.log('📋 Deploying commands to guild (server) for development...');
      const data = await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands },
      );
      console.log(`✅ Successfully reloaded ${data.length} guild commands.`);
      console.log('💡 Note: Guild commands update instantly. Use this for development.');
    } else {
      console.log('🌍 Deploying commands globally...');
      const data = await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands },
      );
      console.log(`✅ Successfully reloaded ${data.length} global commands.`);
      console.log('⚠️  Note: Global commands can take up to 1 hour to update across all servers.');
    }
  } catch (error) {
    console.error('❌ Error deploying commands:', error);
    
    if (error.code === 50001) {
      console.log('💡 Make sure your bot has the "applications.commands" scope when invited to servers.');
    } else if (error.code === 50013) {
      console.log('💡 Make sure your bot has the necessary permissions in the server.');
    }
  }
})();
