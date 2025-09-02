const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pause or resume the currently playing track'),
  
  async execute(interaction) {
    try {
      const musicManager = interaction.client.musicManager;
      const guildId = interaction.guildId;
      
      // Check if user is in the same voice channel as the bot
      const memberVoiceChannel = interaction.member.voice.channel;
      const botVoiceChannelId = musicManager.connections.get(guildId)?.joinConfig.channelId;

      if (!memberVoiceChannel || memberVoiceChannel.id !== botVoiceChannelId) {
        return interaction.reply('❌ You need to be in the same voice channel as the bot to use this command!');
      }
      
      // Check if bot is connected to voice
      if (!musicManager.connections.has(guildId)) {
        return interaction.reply('❌ I\'m not connected to a voice channel!');
      }
      
      // Check if something is currently playing
      const nowPlaying = musicManager.getNowPlaying(guildId);
      if (!nowPlaying) {
        return interaction.reply('❌ Nothing is currently playing!');
      }
      
      // Toggle pause/resume
      const result = musicManager.togglePause(guildId);
      
      if (result === 'paused') {
        const embed = new EmbedBuilder()
          .setColor(0xffa500)
          .setTitle('⏸️ Paused')
          .setDescription(`**${nowPlaying.title}**`)
          .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
      } else if (result === 'resumed') {
        const embed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle('▶️ Resumed')
          .setDescription(`**${nowPlaying.title}**`)
          .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply('❌ Failed to pause/resume playback.');
      }
      
    } catch (error) {
      console.error('Pause command error:', error);
      await interaction.reply(`❌ Error: ${error.message}`);
    }
  },
};
