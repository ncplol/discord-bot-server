const { Events } = require('discord.js');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;

    const controllerRoleName = process.env.CONTROLLER_ROLE_NAME;

    // Role-based access control check
    if (controllerRoleName) {
      const member = interaction.member;
      if (!member.roles.cache.some(role => role.name === controllerRoleName)) {
        await interaction.reply({
          content: `You must have the "${controllerRoleName}" role to use bot commands.`,
          ephemeral: true,
        });
        return;
      }
    }

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
      } else {
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
      }
    }
  },
};
