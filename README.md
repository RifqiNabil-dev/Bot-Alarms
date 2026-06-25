# AlarmBot ⏰

Sebuah Discord bot yang dirancang untuk memantau waktu spawn Boss (World Boss/Raid Boss) dan memberikan notifikasi suara (Voice Alert) secara otomatis ke dalam Voice Channel.

## ✨ Fitur Utama

- **Boss Scheduler**: Secara otomatis membaca jadwal boss dari Google Sheets.
- **Voice Notifications**: Memberikan peringatan suara menggunakan ElevenLabs Text-to-Speech sebelum boss muncul.
- **Custom Boss Sounds**: Memutar suara unik untuk setiap boss tertentu.
- **Interactive Embeds**: Menampilkan jadwal boss yang rapi di channel Discord.
- **Slash Commands**: Navigasi bot yang mudah menggunakan sistem perintah modern Discord.

## 🛠️ Prasyarat

- [Node.js](https://nodejs.org/) v18 ke atas.
- [FFmpeg](https://ffmpeg.org/) terinstall di sistem (diperlukan untuk streaming suara).
- Akun Google Cloud dengan API Google Sheets diaktifkan.

## 🚀 Instalasi

1. Clone repositori ini:
   ```bash
   git clone https://github.com/RifqiNabil-dev/Bot-Alarms.git
   cd Bot-Alarms
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Konfigurasi kredensial Google:
   Letakkan file `credentials.json` (Service Account) dalam root folder.

4. Buat file `.env` berdasarkan `.env.example`:
   ```env
   DISCORD_TOKEN=your_token
   CLIENT_ID=your_client_id
   SPREADSHEET_ID=your_id
   ...
   ```

## 📜 Perintah Bot

- `/jadwalboss` - Menampilkan jadwal boss yang aktif saat ini.
- `/joinvc` - Meminta bot untuk masuk ke Voice Channel pilihan.
- `/leavevc` - Meminta bot untuk keluar dari Voice Channel.
- `/testspawn` - Melakukan simulasi spawn boss untuk pengujian.
- `/testvoice` - Menguji fitur Text-to-Speech dan pemutaran suara.

## 🏗️ Struktur Proyek

- `commands/` - Berisi logika untuk semua Slash Commands.
- `utils/` - Utilitas pendukung (Voice Player, Scheduler, Sheets API).
- `data/` - Folder penyimpanan file MP3/WAV dan data boss lokal.
