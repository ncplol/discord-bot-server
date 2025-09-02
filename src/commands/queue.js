const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const MusicManager = require('../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Show the current music queue'),
  
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
      
      // Check if bot is in a voice channel
      if (!musicManager.connections.has(guildId)) {
        return interaction.reply('❌ I\'m not currently in a voice channel.');
      }
      
      const nowPlaying = musicManager.getNowPlaying(guildId);
      const queue = musicManager.getQueue(guildId);
      
      if (!nowPlaying && queue.length === 0) {
        return interaction.reply('❌ No music is currently playing or queued.');
      }
      
      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('🎵 Music Queue')
        .setTimestamp();
      
      // Show currently playing
      if (nowPlaying) {
        embed.addFields({
          name: '🎵 Now Playing',
          value: `**${nowPlaying.title}**\nDuration: ${formatDuration(nowPlaying.duration)} | Author: ${nowPlaying.author || 'Unknown'}`,
          inline: false
        });
      }
      
      // Show queue
      if (queue.length > 0) {
        const queueList = queue.slice(0, 10).map((track, index) => 
          `${index + 1}. **${track.title}** - ${formatDuration(track.duration)}`
        ).join('\n');
        
        const remaining = queue.length > 10 ? `\n... and ${queue.length - 10} more tracks` : '';
        
        embed.addFields({
          name: `📋 Queue (${queue.length} tracks)`,
          value: queueList + remaining,
          inline: false
        });
      }
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Queue command error:', error);
      await interaction.reply(`❌ Error: ${error.message}`);
    }
  },
};

function formatDuration(seconds) {
  if (!seconds) return 'Unknown';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
