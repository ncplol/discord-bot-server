const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const MusicManager = require('../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('voice-status')
    .setDescription('Show voice connection status and information'),
  
  async execute(interaction) {
    try {
      const musicManager = interaction.client.musicManager;
      const guildId = interaction.guildId;
      
      const isConnected = musicManager.connections.has(guildId);
      const nowPlaying = musicManager.getNowPlaying(guildId);
      const queue = musicManager.getQueue(guildId);
      
      const embed = new EmbedBuilder()
        .setColor(isConnected ? 0x00ff00 : 0xff6b6b)
        .setTitle('🎵 Voice Status')
        .setTimestamp();
      
      if (isConnected) {
        const connection = musicManager.connections.get(guildId);
        const player = musicManager.players.get(guildId);
        const channel = interaction.guild.channels.cache.get(connection.joinConfig.channelId);
        
        embed.setDescription(`✅ Connected to **${channel?.name || 'Unknown Channel'}**`)
          .addFields(
            { name: 'Connection Status', value: connection.state.status, inline: true },
            { name: 'Channel', value: channel?.name || 'Unknown', inline: true },
            { name: 'Server', value: interaction.guild.name, inline: true },
            { name: 'Queue Length', value: queue.length.toString(), inline: true },
            { name: 'Player Status', value: player?.state.status || 'Unknown', inline: true }
          );
        
        if (nowPlaying) {
          embed.addFields({
            name: '🎵 Now Playing',
            value: `**${nowPlaying.title}**\nDuration: ${formatDuration(nowPlaying.duration)} | Author: ${nowPlaying.author || 'Unknown'}`,
            inline: false
          });
        }
        
        if (queue.length > 0) {
          const nextTracks = queue.slice(0, 3).map((track, index) => 
            `${index + 1}. ${track.title}`
          ).join('\n');
          
          embed.addFields({
            name: `📋 Next in Queue (${queue.length} tracks)`,
            value: nextTracks + (queue.length > 3 ? `\n... and ${queue.length - 3} more` : ''),
            inline: false
          });
        }
      } else {
        embed.setDescription('❌ Not connected to any voice channel')
          .addFields(
            { name: 'Status', value: 'Disconnected', inline: true },
            { name: 'Server', value: interaction.guild.name, inline: true }
          );
      }
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Voice status command error:', error);
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
