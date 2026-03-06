const { SlashCommandBuilder } = require("discord.js");
const voicePlayer = require("../utils/voicePlayer");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("joinvc")
    .setDescription("Bot bergabung ke Voice Channel"),
  async execute(interaction) {
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel)
      return interaction.reply({
        content: "Kamu harus berada di Voice Channel!",
        flags: 64,
      });

    await interaction.deferReply();

    const success = await voicePlayer.join(voiceChannel);
    if (success) interaction.editReply("Bot berhasil bergabung ke Voice Channel.");
    else interaction.editReply("Gagal bergabung ke Voice Channel.");
  },
};
