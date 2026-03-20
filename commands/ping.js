const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Cek latensi (ping) bot"),
  async execute(interaction) {
    const sent = await interaction.reply({
      content: "Pinging...",
      fetchReply: true,
      flags: 64,
    });

    const apiLatency = sent.createdTimestamp - interaction.createdTimestamp;
    const wsLatency = interaction.client.ws.ping;

    const embed = new EmbedBuilder()
      .setTitle("🏓 Pong!")
      .setColor(0x00ff00)
      .addFields(
        { name: "Latensi API", value: `${apiLatency}ms`, inline: true },
        { name: "Latensi WebSocket", value: `${wsLatency}ms`, inline: true },
      )
      .setFooter({ text: "Bot Latency Status" })
      .setTimestamp();

    await interaction.editReply({
      content: null,
      embeds: [embed],
    });
  },
};
