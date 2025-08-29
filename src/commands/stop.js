const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const MusicManager = require('../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop music and leave voice channel'),
  
  async execute(interaction) {
    try {
      const musicManager = interaction.client.musicManager;
      const guildId = interaction.guildId;
      
      // Check if bot is in a voice channel
      if (!musicManager.connections.has(guildId)) {
        return interaction.reply('❌ I\'m not currently in a voice channel.');
      }
      
      // Leave voice channel
      await musicManager.leaveVoiceChannel(guildId);
      
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('⏹️ Music Stopped')
        .setDescription('Stopped playback and left the voice channel.')
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Stop command error:', error);
      await interaction.reply(`❌ Error: ${error.message}`);
    }
  },
};
