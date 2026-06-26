const { google } = require("googleapis");
const fs = require("fs-extra");
const path = require("path");
const { DateTime } = require("luxon");
require("dotenv").config();

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"];
const DATA_PATH = path.join(__dirname, "..", "data_boss.json");
const INVASI_DATA_PATH = path.join(__dirname, "..", "invasi_boss.json");

async function getSheetsData() {
  try {
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: SCOPES,
    });

    const sheets = google.sheets({ version: "v4", auth });
    const jakarta_tz = "Asia/Jakarta";
    const now = DateTime.now().setZone(jakarta_tz);

    // 1. Fetch Erica 4 Sheet
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: `${process.env.SHEET_NAME}!B4:G`,
    });

    const rows = res.data.values;
    let bossData = [];
    if (rows && rows.length > 0) {
      bossData = rows
        .map((row) => {
          if (!row || row.length < 5 || !row[4]) return null;

          const zone = (row[0] || "").trim();
          let respawn_time_str = (row[1] || "").trim();
          const area = (row[2] || "").trim();
          const boss_die = (row[3] || "").trim();
          const boss_name = (row[4] || "").trim();
          const boss_next = (row[5] || "").trim();

          // 1. Format respawn_time_str to HH:mm:ss
          if (respawn_time_str && !respawn_time_str.includes(":")) {
            const hours = parseInt(respawn_time_str);
            respawn_time_str = isNaN(hours)
              ? "00:00:00"
              : `${hours.toString().padStart(2, "0")}:00:00`;
          }
          if (respawn_time_str) {
            const parts = respawn_time_str.split(":");
            if (parts.length === 2) respawn_time_str += ":00";
            else if (parts.length === 1)
              respawn_time_str = `${parts[0].padStart(2, "0")}:00:00`;
          } else {
            respawn_time_str = "00:00:00";
          }

          // 2. Process last_kill_dt
          let last_kill_dt_iso = null;
          if (boss_die) {
            try {
              const parts = boss_die.split(":");
              let kill_dt = now.set({
                hour: parseInt(parts[0]),
                minute: parseInt(parts[1]),
                second: parts[2] ? parseInt(parts[2]) : 0,
                millisecond: 0,
              });
              if (kill_dt > now) kill_dt = kill_dt.minus({ days: 1 });
              last_kill_dt_iso = kill_dt.toISO();
            } catch (e) {
              console.error(`Error parsing Boss Die time for ${boss_name}:`, e);
            }
          }

          // 3. Process current_spawn_dt
          let current_spawn_dt_iso = null;
          let status_initial = "unknown";
          if (boss_next) {
            try {
              const parts = boss_next.split(":");
              let next_dt = now.set({
                hour: parseInt(parts[0]),
                minute: parseInt(parts[1]),
                second: parts[2] ? parseInt(parts[2]) : 0,
                millisecond: 0,
              });
              if (next_dt < now) next_dt = next_dt.plus({ days: 1 });
              current_spawn_dt_iso = next_dt.toISO();
              status_initial = next_dt < now ? "spawned" : "killed";
            } catch (e) {
              console.error(`Error parsing Boss Next time for ${boss_name}:`, e);
            }
          }

          return {
            type: "erica",
            name: boss_name,
            area: zone ? `${zone} - ${area}` : area,
            original_spawn: boss_next || "00:00:00",
            status: status_initial,
            current_spawn_dt: current_spawn_dt_iso,
            respawn_time_str: respawn_time_str,
            sent_reminders: [],
            last_kill_dt: last_kill_dt_iso,
          };
        })
        .filter((b) => b !== null);
    }

    await fs.writeJson(DATA_PATH, bossData, { spaces: 2 });
    console.log(
      `Synced ${bossData.length} bosses to data_boss.json at ${now.toLocaleString(DateTime.TIME_24_WITH_SECONDS)}`,
    );

    // 2. Fetch Invasion Sheet
    let invasionData = [];
    try {
      const resInvasion = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: "Invasion!B3:J",
      });

      const rowsInvasion = resInvasion.data.values;
      if (rowsInvasion && rowsInvasion.length > 0) {
        invasionData = rowsInvasion
          .map((row) => {
            // Mapping for Invasion:
            // Col B (0): Zone
            // Col C (1): Spawn Area
            // Col D (2): Respawn
            // Col E (3): Monster Name
            // Col F (4): Next Spawn
            // Col G (5): Boss Die
            // Col H (6): Status
            // Col I (7): Sorting
            // Col J (8): Server

            if (!row || row.length < 9 || !row[3]) return null;

            const zone = (row[0] || "").trim();
            const spawnArea = (row[1] || "").trim();
            const monsterName = (row[3] || "").trim();
            const nextSpawn = (row[4] || "").trim();
            const status = (row[6] || "").trim();
            const server = (row[8] || "").trim();

            if (status.toLowerCase() !== "akurat") return null;

            let current_spawn_dt_iso = null;
            if (nextSpawn) {
              try {
                const parts = nextSpawn.split(":");
                let next_dt = now.set({
                  hour: parseInt(parts[0]),
                  minute: parseInt(parts[1]),
                  second: parts[2] ? parseInt(parts[2]) : 0,
                  millisecond: 0,
                });
                if (next_dt < now) next_dt = next_dt.plus({ days: 1 });
                current_spawn_dt_iso = next_dt.toISO();
              } catch (e) {
                console.error(`Error parsing Next Spawn for ${monsterName}:`, e);
              }
            }

            return {
              type: "invasion",
              name: monsterName,
              area: zone ? `${zone} - ${spawnArea}` : spawnArea,
              original_spawn: nextSpawn || "00:00:00",
              status: status,
              server: server,
              current_spawn_dt: current_spawn_dt_iso,
            };
          })
          .filter((b) => b !== null);
      }
    } catch (e) {
      console.error("Error fetching or parsing Invasion sheet:", e);
    }

    await fs.writeJson(INVASI_DATA_PATH, invasionData, { spaces: 2 });
    console.log(
      `Synced ${invasionData.length} invasion bosses to invasi_boss.json at ${now.toLocaleString(DateTime.TIME_24_WITH_SECONDS)}`,
    );

    return { bossData, invasionData };
  } catch (error) {
    console.error("Error fetching Google Sheets data:", error);
    return null;
  }
}

module.exports = { getSheetsData };
