const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Set or check the playback volume')
    .addIntegerOption(option =>
      option.setName('level')
        .setDescription('Volume level (0-200, default: 100)')
        .setMinValue(0)
        .setMaxValue(200)
        .setRequired(false)),
  
  async execute(interaction) {
    try {
      const musicManager = interaction.client.musicManager;
      const guildId = interaction.guildId;
      const volumeLevel = interaction.options.getInteger('level');
      
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
      
      const player = musicManager.players.get(guildId);
      if (!player) {
        return interaction.reply('❌ No audio player found!');
      }
      
      if (volumeLevel !== null) {
        // Set new volume
        const currentResource = player.state.resource;
        if (currentResource && currentResource.volume) {
          currentResource.volume.setVolume(volumeLevel / 100);
          
          const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('🔊 Volume Set')
            .setDescription(`Volume set to **${volumeLevel}%**`)
            .addFields(
              { name: 'Track', value: nowPlaying.title, inline: true }
            )
            .setTimestamp();
          
          await interaction.reply({ embeds: [embed] });
        } else {
          await interaction.reply('❌ Cannot adjust volume for current audio source.');
        }
      } else {
        // Check current volume
        const currentResource = player.state.resource;
        let currentVolume = 100;
        
        if (currentResource && currentResource.volume) {
          currentVolume = Math.round(currentResource.volume.volume * 100);
        }
        
        const embed = new EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle('🔊 Current Volume')
          .setDescription(`Current volume: **${currentVolume}%**`)
          .addFields(
            { name: 'Track', value: nowPlaying.title, inline: true },
            { name: 'Usage', value: 'Use `/volume <level>` to change volume', inline: true }
          )
          .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
      }
      
    } catch (error) {
      console.error('Volume command error:', error);
      await interaction.reply(`❌ Error: ${error.message}`);
    }
  },
};
