const { SlashCommandBuilder } = require("discord.js");
const voicePlayer = require("../utils/voicePlayer");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("testvoice")
    .setDescription("Test suara bot alarm boss"),
  async execute(interaction) {
    const voiceChannel = interaction.member.voice.channel;

    await interaction.deferReply();

    if (!voicePlayer.isConnected()) {
      if (!voiceChannel)
        return interaction.editReply({
          content: "Kamu harus berada di Voice Channel untuk melakukan test!",
        });

      const success = await voicePlayer.join(voiceChannel);
      if (!success) return interaction.editReply("Gagal bergabung ke Voice Channel.");
    }

    await interaction.editReply("Sedang melakukan test voice gTTS...");
    await voicePlayer.playGTTS(
      "Percobaan suara bot alarm boss. Satu, dua, tiga.",
    );
  },
};
