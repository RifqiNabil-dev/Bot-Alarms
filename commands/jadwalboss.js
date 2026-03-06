const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs-extra");
const path = require("path");
const { DateTime } = require("luxon");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("jadwalboss")
    .setDescription("Menampilkan jadwal spawn boss Lineage2M"),
  async execute(interaction) {
    const dataPath = path.join(__dirname, "..", "data_boss.json");
    const jakarta_tz = "Asia/Jakarta";

    if (!fs.existsSync(dataPath)) {
      return await interaction.reply({
        content:
          "Data boss belum tersedia. Silakan tunggu sinkronisasi berikutnya.",
        ephemeral: true,
      });
    }

    const bosses = await fs.readJson(dataPath);
    if (bosses.length === 0) {
      return await interaction.reply({
        content: "Tidak ada jadwal boss yang ditemukan.",
        ephemeral: true,
      });
    }

    const now = DateTime.now().setZone(jakarta_tz);

    // Sort bosses by next spawn time
    const sortedBosses = bosses
      .filter((b) => b.current_spawn_dt)
      .sort(
        (a, b) =>
          DateTime.fromISO(a.current_spawn_dt).toMillis() -
          DateTime.fromISO(b.current_spawn_dt).toMillis(),
      );

    const embed = new EmbedBuilder()
      .setTitle("⌛ Jadwal Spawn Boss Lineage2M ⌛")
      .setDescription(
        "Berikut adalah daftar boss dan perkiraan waktu spawn mereka (WIB):",
      )
      .setColor(0x00ff00) // Vibrant Green
      .setTimestamp();

    const scheduleList = sortedBosses
      .map((b) => {
        const spawnTime = DateTime.fromISO(b.current_spawn_dt).setZone(
          jakarta_tz,
        );
        const lastKillTime = b.last_kill_dt
          ? DateTime.fromISO(b.last_kill_dt).setZone(jakarta_tz)
          : null;

        const diff = spawnTime.diff(now, ["hours", "minutes"]);
        let countdown = "";
        if (diff.hours > 0) {
          countdown = `\`${Math.floor(diff.hours)}j ${Math.floor(diff.minutes || 0)}m\``;
        } else {
          countdown = `\`${Math.floor(diff.minutes || 0)}m\``;
        }

        const lastKillStr = lastKillTime
          ? `\`${lastKillTime.toFormat("yyyy-MM-dd HH:mm:ss")}\``
          : "`-`";
        const nextSpawnStr = `\`${spawnTime.toFormat("yyyy-MM-dd HH:mm:ss")}\``;
        const respawnTimeStr = `\`${b.respawn_time_str}\``;

        return (
          `💀 **${b.name}** 💀\n` +
          `📍 **Area:** ${b.area}\n` +
          `🔄 **Respawn Time:** ${respawnTimeStr}\n` +
          `⚔️ **Terakhir dibunuh:** ${lastKillStr}\n` +
          `🔄 **Respawn dalam:** ${countdown}\n` +
          `📅 **Next Spawn:** ${nextSpawnStr}`
        );
      })
      .slice(0, 10) // Limit to first 10 for readability in one embed
      .join("\n\n");

    embed.setDescription(
      `Berikut adalah daftar boss dan perkiraan waktu spawn mereka (WIB):\n\n${scheduleList}`,
    );

    await interaction.reply({ embeds: [embed] });
  },
};
