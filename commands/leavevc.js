const { SlashCommandBuilder } = require("discord.js");
const voicePlayer = require("../utils/voicePlayer");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leavevc")
    .setDescription("Bot meninggalkan Voice Channel"),
  async execute(interaction) {
    voicePlayer.leave();
    interaction.reply("Bot meninggalkan Voice Channel.");
  },
};
