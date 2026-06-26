const { getSheetsData } = require("./googleSheets");
const voicePlayer = require("./voicePlayer");
const fs = require("fs-extra");
const path = require("path");
const { EmbedBuilder } = require("discord.js");
const { DateTime } = require("luxon");
require("dotenv").config();

const DATA_PATH = path.join(__dirname, "..", "data_boss.json");
const INVASI_DATA_PATH = path.join(__dirname, "..", "invasi_boss.json");
const jakarta_tz = "Asia/Jakarta";
let notified = new Set();

async function runScheduler(client) {
  // 1. Sync Loop (Every 20 minutes)
  setInterval(
    async () => {
      await getSheetsData();
    },
    20 * 60 * 1000,
  );

  // Initial sync
  await getSheetsData();

  // 2. Checker Loop (Every 10 seconds)
  setInterval(async () => {
    await checkBossTime(client);
  }, 10000);
}

async function checkBossTime(client) {
  let bosses = [];

  if (fs.existsSync(DATA_PATH)) {
    try {
      const ericaBosses = await fs.readJson(DATA_PATH);
      bosses = bosses.concat(ericaBosses);
    } catch (e) {
      console.error("Error reading data_boss.json:", e);
    }
  }

  if (fs.existsSync(INVASI_DATA_PATH)) {
    try {
      const invasionBosses = await fs.readJson(INVASI_DATA_PATH);
      bosses = bosses.concat(invasionBosses);
    } catch (e) {
      console.error("Error reading invasi_boss.json:", e);
    }
  }

  if (bosses.length === 0) return;

  const now = DateTime.now().setZone(jakarta_tz);

  const channelNotif = await client.channels.fetch(
    process.env.CHANNEL_NOTIF_ID,
  );
  const voiceChannel = await client.channels.fetch(
    process.env.CHANNEL_VOICE_ID,
  );

  for (const boss of bosses) {
    if (!boss.current_spawn_dt) continue;

    const spawnTime = DateTime.fromISO(boss.current_spawn_dt).setZone(
      jakarta_tz,
    );
    const diffInMinutes = spawnTime.diff(now, "minutes").minutes;

    // Notification 3 Minutes Before
    // If diff is between 2.9 and 3.1 (to catch it in the 10s loop)
    if (diffInMinutes <= 3 && diffInMinutes > 2.8) {
      const key = `${boss.name}-${boss.type || "erica"}-3m-${spawnTime.toFormat("HH:mm")}`;
      if (!notified.has(key)) {
        notified.add(key); // Mark as notified BEFORE awaiting audio
        await sendNotification(channelNotif, boss, 3);
        await triggerVoiceAlarm(voiceChannel, boss, 3);
      }
    }

    // Notification 0 Minutes (Spawn)
    if (diffInMinutes <= 0 && diffInMinutes > -0.2) {
      const key = `${boss.name}-${boss.type || "erica"}-0m-${spawnTime.toFormat("HH:mm")}`;
      if (!notified.has(key)) {
        notified.add(key); // Mark as notified BEFORE awaiting audio
        await sendNotification(channelNotif, boss, 0);
        await triggerVoiceAlarm(voiceChannel, boss, 0);
      }
    }
  }

  // Clear notified set daily at midnight Jakarta time
  if (now.hour === 0 && now.minute === 0 && now.second < 10) notified.clear();
}

async function sendNotification(channel, boss, minutesRemaining) {
  const spawnTimeStr = boss.current_spawn_dt
    ? DateTime.fromISO(boss.current_spawn_dt)
        .setZone(jakarta_tz)
        .toFormat("HH:mm")
    : boss.original_spawn;

  const bossImageName = boss.name
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const imageUrl = `https://raw.githubusercontent.com/RifqiNabil-dev/Image-Boss/refs/heads/main/images/${bossImageName}.png`;

  const isInvasion = boss.type === "invasion";
  const systemName = isInvasion ? "Invasion" : "Erica 4";

  const embed = new EmbedBuilder().setFooter({
    text: `Lineage 2M Boss Notification System • Botol Yaww - ${systemName}`,
  });

  const mention = process.env.ROLE_ID ? `<@&${process.env.ROLE_ID}>` : "";

  if (minutesRemaining === 3) {
    embed
      .setTitle(isInvasion ? `⏰ 3 Menit Lagi Invasion ${boss.name} Spawn!` : `⏰ 3 Menit Lagi ${boss.name} Spawn!`)
      .setColor(isInvasion ? 0xff00ff : 0xffa500) // Purple for Invasion, Orange for Erica
      .addFields(
        {
          name: "📋 Detail",
          value: `📍 **Lokasi**\n${boss.area}`,
          inline: false,
        }
      );

    if (isInvasion && boss.server) {
      embed.addFields({ name: "🖥️ Server", value: boss.server, inline: true });
    }

    embed.addFields(
      { name: "⏰ Waktu Tersisa", value: "3 menit", inline: false },
      { name: "🚀 Aksi", value: `Bersiap!\n${mention}`, inline: false }
    );
  } else {
    embed
      .setTitle(isInvasion ? `💥 INVASION ${boss.name} SPAWN! 💥` : `💥 BOSS ${boss.name} SPAWN! 💥`)
      .setColor(isInvasion ? 0xff00ff : 0xffff00) // Purple for Invasion, Yellow for Erica
      .addFields(
        {
          name: "📋 Detail",
          value: `📍 **Lokasi**\n${boss.area}`,
          inline: false,
        }
      );

    if (isInvasion && boss.server) {
      embed.addFields({ name: "🖥️ Server", value: boss.server, inline: true });
    }

    embed.addFields(
      { name: "⚡ Status", value: "SUDAH SPAWN!", inline: false },
      {
        name: "⏰ Waktu",
        value: `${spawnTimeStr} WIB\n${mention}`,
        inline: false,
      }
    );
  }

  embed.setImage(imageUrl);

  await channel.send({
    content: mention || undefined,
    embeds: [embed],
  });
}

async function triggerVoiceAlarm(channel, boss, minutesRemaining) {
  if (!voicePlayer.isConnected()) {
    const success = await voicePlayer.join(channel);
    if (!success) return;
  }

  const isInvasion = boss.type === "invasion";

  if (minutesRemaining === 3) {
    if (isInvasion) {
      const narration = `Invasion ${boss.name} incoming in ${minutesRemaining} minutes. Please get ready.`;
      // ONLY Edge TTS, no alert_3_minutes.mp3
      await voicePlayer.playTTS(narration);
    } else {
      const BOSS_NARRATIONS_TIME_SPECIFIC = [
        " Boss {boss} incoming in {time_left} minutes. Please get ready.",
      ];
      const selected_narration =
        BOSS_NARRATIONS_TIME_SPECIFIC[
          Math.floor(Math.random() * BOSS_NARRATIONS_TIME_SPECIFIC.length)
        ];
      const narration = selected_narration
        .replace("{boss}", boss.name)
        .replace("{location}", boss.area)
        .replace("{time_left}", minutesRemaining);

      const alertFilePath = path.join(__dirname, "../data/alert_3_minutes.mp3");
      // Play alert file first, then the narration
      await voicePlayer.playFile(alertFilePath);
      await voicePlayer.playTTS(narration);
    }
  } else {
    if (isInvasion) {
      const spawnNarration = `Invasion ${boss.name} has spawned. Lets go.`;
      // ONLY Edge TTS, no custom wav
      await voicePlayer.playTTS(spawnNarration);
    } else {
      await voicePlayer.playWav(boss.name);
      const spawnNarration = `${boss.name} has spawned. Move now.`;
      await voicePlayer.playTTS(spawnNarration);
    }
  }
}

module.exports = { runScheduler };
