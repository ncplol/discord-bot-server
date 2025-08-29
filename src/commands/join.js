const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const MusicManager = require('../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('join')
    .setDescription('Join your current voice channel'),
  
  async execute(interaction) {
    try {
      const musicManager = interaction.client.musicManager;
      
      // Join voice channel
      await musicManager.joinVoiceChannel(interaction);
      
      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('🎵 Joined Voice Channel')
        .setDescription(`Successfully joined **${interaction.member.voice.channel.name}**`)
        .addFields(
          { name: 'Channel', value: interaction.member.voice.channel.name, inline: true },
          { name: 'Server', value: interaction.guild.name, inline: true },
          { name: 'Status', value: 'Ready for music!', inline: true }
        )
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Join command error:', error);
      await interaction.reply(`❌ Error: ${error.message}`);
    }
  },
};
