const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const MusicManager = require('../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leave')
    .setDescription('Leave the voice channel'),
  
  async execute(interaction) {
    try {
      const musicManager = interaction.client.musicManager;
      const guildId = interaction.guildId;
      
      // Check if bot is in a voice channel
      if (!musicManager.connections.has(guildId)) {
        return interaction.reply('❌ I\'m not currently in a voice channel.');
      }
      
      // Get current voice channel info before leaving
      const connection = musicManager.connections.get(guildId);
      const channelName = interaction.guild.channels.cache.get(connection.joinConfig.channelId)?.name || 'Unknown';
      
      // Leave voice channel
      await musicManager.leaveVoiceChannel(guildId);
      
      const embed = new EmbedBuilder()
        .setColor(0xff6b6b)
        .setTitle('👋 Left Voice Channel')
        .setDescription(`Successfully left **${channelName}**`)
        .addFields(
          { name: 'Channel', value: channelName, inline: true },
          { name: 'Server', value: interaction.guild.name, inline: true },
          { name: 'Status', value: 'Disconnected', inline: true }
        )
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Leave command error:', error);
      await interaction.reply(`❌ Error: ${error.message}`);
    }
  },
};
