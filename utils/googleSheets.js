const { google } = require("googleapis");
const fs = require("fs-extra");
const path = require("path");
const { DateTime } = require("luxon");
require("dotenv").config();

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"];
const DATA_PATH = path.join(__dirname, "..", "data_boss.json");

async function getSheetsData() {
  try {
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: SCOPES,
    });

    const sheets = google.sheets({ version: "v4", auth });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: `${process.env.SHEET_NAME}!B4:G`,
    });

    const rows = res.data.values;
    if (!rows || rows.length === 0) {
      console.log("No data found.");
      return [];
    }

    const jakarta_tz = "Asia/Jakarta";
    const now = DateTime.now().setZone(jakarta_tz);

    const bossData = rows
      .map((row) => {
        // Mapping as per Python script:
        // Col B (0): Zone
        // Col C (1): Respawn Time
        // Col D (2): Area
        // Col E (3): Boss Die
        // Col F (4): Boss Name
        // Col G (5): Boss Next

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

    await fs.writeJson(DATA_PATH, bossData, { spaces: 2 });
    console.log(
      `Synced ${bossData.length} bosses to data_boss.json at ${now.toLocaleString(DateTime.TIME_24_WITH_SECONDS)}`,
    );
    return bossData;
  } catch (error) {
    console.error("Error fetching Google Sheets data:", error);
    return null;
  }
}

module.exports = { getSheetsData };
