const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('debug')
    .setDescription('Debug interaction object structure'),
  
  async execute(interaction) {
    try {
      // Create a safe version of the interaction object for inspection
      const debugInfo = {
        // Basic interaction properties
        id: interaction.id,
        type: interaction.type,
        guildId: interaction.guildId,
        channelId: interaction.channelId,
        userId: interaction.userId,
        
        // Member information
        member: {
          id: interaction.member?.id,
          displayName: interaction.member?.displayName,
          voice: {
            channel: interaction.member?.voice?.channel ? {
              id: interaction.member.voice.channel.id,
              name: interaction.member.voice.channel.name,
              type: interaction.member.voice.channel.type,
              guildId: interaction.member.voice.channel.guildId
            } : null,
            channelId: interaction.member?.voice?.channelId,
            deafened: interaction.member?.voice?.deafened,
            muted: interaction.member?.voice?.muted,
            selfDeaf: interaction.member?.voice?.selfDeaf,
            selfMute: interaction.member?.voice?.selfMute,
            streaming: interaction.member?.voice?.streaming,
            serverDeaf: interaction.member?.voice?.serverDeaf,
            serverMute: interaction.member?.voice?.serverMute,
            suppress: interaction.member?.voice?.suppress
          }
        },
        
        // Guild information
        guild: {
          id: interaction.guild?.id,
          name: interaction.guild?.name,
          voiceAdapterCreator: !!interaction.guild?.voiceAdapterCreator
        },
        
        // Available properties
        availableProperties: Object.keys(interaction).filter(key => 
          !key.startsWith('_') && typeof interaction[key] !== 'function'
        ),
        
        // Member available properties
        memberProperties: interaction.member ? Object.keys(interaction.member).filter(key => 
          !key.startsWith('_') && typeof interaction.member[key] !== 'function'
        ) : [],
        
        // Voice available properties
        voiceProperties: interaction.member?.voice ? Object.keys(interaction.member.voice).filter(key => 
          !key.startsWith('_') && typeof interaction.member.voice[key] !== 'function'
        ) : []
      };
      
      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('🔍 Interaction Debug Info')
        .setDescription('Voice channel information structure')
        .addFields(
          { name: '🎯 Basic Info', value: `ID: ${debugInfo.id}\nType: ${debugInfo.type}\nGuild: ${debugInfo.guildId}`, inline: false },
          { name: '👤 Member', value: `ID: ${debugInfo.member.id}\nName: ${debugInfo.member.displayName}`, inline: true },
          { name: '🎵 Voice Channel', value: debugInfo.member.voice.channel ? 
            `Name: ${debugInfo.member.voice.channel.name}\nID: ${debugInfo.member.voice.channel.id}` : 
            'Not in voice channel', inline: true },
          { name: '🔊 Voice Properties', value: debugInfo.voiceProperties.join(', ') || 'None', inline: false },
          { name: '🏗️ Guild Voice Support', value: debugInfo.guild.voiceAdapterCreator ? '✅ Supported' : '❌ Not supported', inline: true }
        )
        .setTimestamp();
      
      // Also log the full structure to console for detailed inspection
      console.log('🔍 Full interaction object structure:');
      console.log('interaction:', JSON.stringify(debugInfo, null, 2));
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Debug command error:', error);
      await interaction.reply(`❌ Error: ${error.message}`);
    }
  },
};
