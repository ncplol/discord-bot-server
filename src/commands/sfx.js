const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const MusicManager = require('../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sfx')
    .setDescription('Play sound effects in voice channel')
    .addStringOption(option =>
      option.setName('effect')
        .setDescription('Sound effect to play')
        .setRequired(true)
        .addChoices(
          { name: '🎉 Party Horn', value: 'party_horn' },
          { name: '👏 Applause', value: 'applause' },
          { name: '🎵 Bell', value: 'bell' },
          { name: '🚨 Alert', value: 'alert' },
          { name: '🎭 Drum Roll', value: 'drum_roll' },
          { name: '🎪 Fanfare', value: 'fanfare' },
          { name: '🔔 Notification', value: 'notification' },
          { name: '🎊 Celebration', value: 'celebration' }
        )),
  
  async execute(interaction) {
    try {
      const effect = interaction.options.getString('effect');
      const musicManager = interaction.client.musicManager;
      
      // Join voice channel
      await musicManager.joinVoiceChannel(interaction);
      
      // Create sound effect track
      const sfxTrack = {
        title: `Sound Effect: ${effect.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
        url: getSoundEffectUrl(effect),
        duration: 5, // Most sound effects are short
        author: 'Sound Effect',
        thumbnail: null
      };
      
      // Play the sound effect immediately
      await musicManager.playTrack(interaction.guildId, sfxTrack);
      
      const embed = new EmbedBuilder()
        .setColor(0xff69b4)
        .setTitle('🔊 Sound Effect Playing')
        .setDescription(`Playing: **${sfxTrack.title}**`)
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('SFX command error:', error);
      await interaction.reply(`❌ Error: ${error.message}`);
    }
  },
};

function getSoundEffectUrl(effect) {
  // This is a placeholder - you would need to host actual sound effect files
  // or use a service that provides them
  const sfxUrls = {
    'party_horn': 'https://example.com/sounds/party_horn.mp3',
    'applause': 'https://example.com/sounds/applause.mp3',
    'bell': 'https://example.com/sounds/bell.mp3',
    'alert': 'https://example.com/sounds/alert.mp3',
    'drum_roll': 'https://example.com/sounds/drum_roll.mp3',
    'fanfare': 'https://example.com/sounds/fanfare.mp3',
    'notification': 'https://example.com/sounds/notification.mp3',
    'celebration': 'https://example.com/sounds/celebration.mp3'
  };
  
  return sfxUrls[effect] || sfxUrls['bell'];
}
