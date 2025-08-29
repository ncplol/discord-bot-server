const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { AudioPlayerStatus } = require('@discordjs/voice');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resume the currently paused track'),
  
  async execute(interaction) {
    try {
      const musicManager = interaction.client.musicManager;
      const guildId = interaction.guildId;
      
      // Check if bot is connected to voice
      if (!musicManager.connections.has(guildId)) {
        return interaction.reply('❌ I\'m not connected to a voice channel!');
      }
      
      // Check if something is currently playing
      const nowPlaying = musicManager.getNowPlaying(guildId);
      if (!nowPlaying) {
        return interaction.reply('❌ Nothing is currently playing!');
      }
      
      // Check current player status
      const player = musicManager.players.get(guildId);
      if (!player) {
        return interaction.reply('❌ No audio player found!');
      }
      
      if (player.state.status === AudioPlayerStatus.Playing) {
        return interaction.reply('▶️ Music is already playing!');
      }
      
      if (player.state.status === AudioPlayerStatus.Paused) {
        player.unpause();
        
        const embed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle('▶️ Resumed')
          .setDescription(`**${nowPlaying.title}**`)
          .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply('❌ Cannot resume from current state.');
      }
      
    } catch (error) {
      console.error('Resume command error:', error);
      await interaction.reply(`❌ Error: ${error.message}`);
    }
  },
};
