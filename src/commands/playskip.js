const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('playskip')
    .setDescription('Play a song immediately, skipping the current track.')
    .addStringOption(option =>
      option.setName('query')
        .setDescription('YouTube URL or search query')
        .setRequired(true)),
  
  async execute(interaction) {
    await interaction.deferReply();
    
    try {
      const query = interaction.options.getString('query');
      const musicManager = interaction.client.musicManager;
      const guildId = interaction.guildId;

      // Ensure user is in a voice channel to initiate play
      if (!interaction.member.voice.channel) {
          return interaction.editReply('❌ You need to be in a voice channel to use this command!');
      }
      
      // Join voice channel if not already in one
      if (!musicManager.connections.has(guildId)) {
        await musicManager.joinVoiceChannel(interaction);
      }

      let track;
      
      // Check if it's a URL or search query
      if (this.isYouTubeUrl(query)) {
        track = await musicManager.getTrackInfo(query);
      } else {
        const results = await musicManager.searchTracks(query, 1);
        if (results.length === 0) {
          return interaction.editReply('❌ No tracks found for your search.');
        }
        track = results[0];
      }
      
      // Get state BEFORE adding to queue
      const wasPlaying = musicManager.getNowPlaying(guildId);

      // Add the new track to the front of the queue
      musicManager.addToQueueFront(guildId, track);
      
      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('🎵 Now Playing (Skipped)')
        .setDescription(`**${track.title}**`)
        .addFields(
          { name: 'Duration', value: formatDuration(track.duration), inline: true },
          { name: 'Author', value: track.author || 'Unknown', inline: true }
        )
        .setThumbnail(track.thumbnail || null)
        .setTimestamp();
      
      // If a song was playing, skip it. The 'finish' handler will automatically play our new track.
      if (wasPlaying) {
        musicManager.skipTrack(guildId);
      } else {
        // If nothing was playing, just start the playback loop.
        await musicManager.playNext(guildId);
      }
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Playskip command error:', error);
      await interaction.editReply(`❌ Error: ${error.message}`);
    }
  },
  
  isYouTubeUrl(query) {
    const youtubePatterns = [
      /^https?:\/\/(www\.)?youtube\.com\/watch\?v=/,
      /^https?:\/\/youtu\.be\//,
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
