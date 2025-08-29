const { Events } = require('discord.js');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`🚀 Bot is ready! Logged in as ${client.user.tag}`);
    console.log(`📊 Serving ${client.guilds.cache.size} guilds`);
    console.log(`👥 Serving ${client.users.cache.size} users`);
    
    // Set bot status
    client.user.setActivity('with Discord.js', { type: 'PLAYING' });
    
    // Start web interface
    if (client.webInterface) {
      client.webInterface.start(3001);
    }
  },
};
