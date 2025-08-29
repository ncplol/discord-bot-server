const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('Get information about the bot and server'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('🤖 Bot Information')
      .setDescription('Here\'s some information about the bot and server')
      .addFields(
        { name: 'Bot Name', value: interaction.client.user.username, inline: true },
        { name: 'Bot ID', value: interaction.client.user.id, inline: true },
        { name: 'Created At', value: interaction.client.user.createdAt.toDateString(), inline: true },
        { name: 'Server Name', value: interaction.guild.name, inline: true },
        { name: 'Server ID', value: interaction.guild.id, inline: true },
        { name: 'Member Count', value: interaction.guild.memberCount.toString(), inline: true },
        { name: 'Uptime', value: formatUptime(interaction.client.uptime), inline: false }
      )
      .setTimestamp()
      .setFooter({ text: 'Discord Bot Server' });

    await interaction.reply({ embeds: [embed] });
  },
};

function formatUptime(ms) {
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0) parts.push(`${seconds}s`);

  return parts.join(' ') || '0s';
}
