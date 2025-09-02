const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const MusicManager = require('../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play music from YouTube or search for tracks')
    .addStringOption(option =>
      option.setName('query')
        .setDescription('YouTube URL or search query')
        .setRequired(true)),
  
  async execute(interaction) {
    await interaction.deferReply();
    
    try {
      const query = interaction.options.getString('query');
      const musicManager = interaction.client.musicManager;
      
      // Join voice channel
      await musicManager.joinVoiceChannel(interaction);
      
      let track;
      
      // Check if it's a URL or search query
      if (this.isYouTubeUrl(query)) {
        // It's a YouTube URL
        track = await musicManager.getTrackInfo(query);
      } else {
        // It's a search query
        const results = await musicManager.searchTracks(query, 1);
        if (results.length === 0) {
          return interaction.editReply('❌ No tracks found for your search.');
        }
        track = results[0];
      }
      
      // Add to queue and play
      const queuePosition = musicManager.addToQueue(interaction.guildId, track);
      
      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('🎵 Added to Queue')
        .setDescription(`**${track.title}**`)
        .addFields(
          { name: 'Duration', value: formatDuration(track.duration), inline: true },
          { name: 'Author', value: track.author || 'Unknown', inline: true },
          { name: 'Position', value: queuePosition === 1 ? 'Now Playing' : `#${queuePosition} in queue`, inline: true }
        )
        .setThumbnail(track.thumbnail || null)
        .setTimestamp();
      
      // If nothing is currently playing, start the playback loop.
      // playNext() will handle pulling the track from the queue.
      if (!musicManager.getNowPlaying(interaction.guildId)) {
        await musicManager.playNext(interaction.guildId);
        embed.setTitle('🎵 Now Playing');
      }
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Play command error:', error);
      await interaction.editReply(`❌ Error: ${error.message}`);
    }
  },
  
  // Helper method to check if a string is a YouTube URL
  isYouTubeUrl(query) {
    const youtubePatterns = [
      /^https?:\/\/(www\.)?youtube\.com\/watch\?v=/,
      /^https?:\/\/youtu\.be\//,
      /^https?:\/\/(www\.)?youtube\.com\/embed\//,
      /^https?:\/\/(www\.)?youtube\.com\/v\//
    ];
    
    return youtubePatterns.some(pattern => pattern.test(query));
  }
};

function formatDuration(seconds) {
  if (!seconds) return 'Unknown';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
