const { SlashCommandBuilder } = require("discord.js");
const voicePlayer = require("../utils/voicePlayer");
const fs = require("fs-extra");
const path = require("path");

const DATA_PATH = path.join(__dirname, "..", "data_boss.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("testspawn")
    .setDescription("Tes suara alert spawn 0 menit")
    .addStringOption((option) =>
      option
        .setName("boss")
        .setDescription("Nama boss yang ingin dites (contoh: Orfen)")
        .setRequired(true),
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const bossName = interaction.options.getString("boss");
    const voiceChannel = interaction.member.voice.channel;

    // Load boss data to get the area
    if (!fs.existsSync(DATA_PATH)) {
      return interaction.editReply("Data boss tidak ditemukan.");
    }

    const bosses = await fs.readJson(DATA_PATH);
    const boss = bosses.find(
      (b) => b.name.toLowerCase() === bossName.toLowerCase(),
    );

    if (!boss) {
      return interaction.editReply(
        `Boss dengan nama "${bossName}" tidak ditemukan di data_boss.json.`,
      );
    }

    if (!voicePlayer.isConnected()) {
      if (!voiceChannel)
        return interaction.editReply({
          content: "Kamu harus berada di Voice Channel untuk melakukan test!",
        });

      const success = await voicePlayer.join(voiceChannel);
      if (!success)
        return interaction.editReply("Gagal bergabung ke Voice Channel.");
    }

    await interaction.editReply(
      `Sedang melakukan test spawn alert untuk **${boss.name}**...`,
    );

    // Play custom sound (.wav)
    await voicePlayer.playWav(boss.name);

    // Play spawn narration
    const spawnNarration = `${boss.name} SEHARUSNYA sudah spawn sekarang di ${boss.area}!`;
    await voicePlayer.playGTTS(spawnNarration);

    await interaction.editReply(
      `Test spawn alert untuk **${boss.name}** selesai.`,
    );
  },
};
