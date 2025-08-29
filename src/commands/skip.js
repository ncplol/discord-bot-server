const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const MusicManager = require('../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip the current track'),
  
  async execute(interaction) {
    try {
      const musicManager = interaction.client.musicManager;
      const guildId = interaction.guildId;
      
      // Check if bot is in a voice channel
      if (!musicManager.connections.has(guildId)) {
        return interaction.reply('❌ I\'m not currently in a voice channel.');
      }
      
      // Check if there's a track playing
      const nowPlaying = musicManager.getNowPlaying(guildId);
      if (!nowPlaying) {
        return interaction.reply('❌ No track is currently playing.');
      }
      
      // Skip the track
      const skipped = musicManager.skipTrack(guildId);
      if (!skipped) {
        return interaction.reply('❌ Failed to skip track.');
      }
      
      const embed = new EmbedBuilder()
        .setColor(0xffff00)
        .setTitle('⏭️ Track Skipped')
        .setDescription(`Skipped: **${nowPlaying.title}**`)
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Skip command error:', error);
      await interaction.reply(`❌ Error: ${error.message}`);
    }
  },
};
