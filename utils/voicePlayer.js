const {
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
} = require("@discordjs/voice");
const gTTS = require("node-gtts");
const path = require("path");
const fs = require("fs-extra");
const gtts = new gTTS("id"); // Language: Indonesian, Speed: Normal (slow=False)

class VoicePlayer {
  constructor() {
    this.player = createAudioPlayer();
    this.connection = null;
  }

  async join(channel) {
    console.log(
      `Attempting to join voice channel: ${channel.name} (${channel.id})`,
    );

    // Permission check
    const permissions = channel.permissionsFor(channel.client.user);
    if (!permissions.has("Connect") || !permissions.has("Speak")) {
      console.error(
        `Insufficient permissions to join/speak in ${channel.name}. MISSING: ${!permissions.has("Connect") ? "CONNECT " : ""}${!permissions.has("Speak") ? "SPEAK" : ""}`,
      );
      return false;
    }

    console.log(
      `Permissions verified. Channel: ${channel.name}, Guild: ${channel.guild.name}`,
    );

    if (this.connection) {
      console.log("Destroying existing connection before re-joining...");
      this.connection.destroy();
    }

    this.connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: true,
      selfMute: false,
    });

    // Detailed state and error logging
    this.connection.on("stateChange", (oldState, newState) => {
      console.log(
        `VoiceConnection state change: ${oldState.status} -> ${newState.status}`,
      );
      if (newState.status === VoiceConnectionStatus.Disconnected) {
        console.warn("VoiceConnection disconnected. Reason:", newState.reason);
        // Try and see why it disconnected
      }
    });

    this.connection.on("error", (error) => {
      console.error("VoiceConnection Error:", error);
    });

    this.connection.on("debug", (message) => {
      console.log(`[Voice Debug] ${message}`);
    });

    try {
      console.log("Waiting for voice connection to be Ready...");

      // Manual state transition handling for some network environments
      this.connection.on("stateChange", (oldState, newState) => {
        if (newState.status === VoiceConnectionStatus.Signalling) {
          console.log(
            "Manual trigger: detected Signalling, waiting for connection...",
          );
        }
      });

      // Wait for Ready or Disconnected to see what happens first
      await entersState(this.connection, VoiceConnectionStatus.Ready, 45_000);

      this.connection.subscribe(this.player);
      console.log("Voice connection is now READY and subscribed to player.");
      return true;
    } catch (error) {
      console.error(
        "Voice connection failed to reach READY state within 45s:",
        error,
      );
      // More debug info
      console.log("Final Connection State:", this.connection.state.status);

      // If we are stuck in Signalling but the bot IS in the channel,
      // some environments can still play audio if we just proceed.
      // But usually, it means UDP is blocked.

      if (this.connection) {
        this.connection.destroy();
        this.connection = null;
      }
      return false;
    }
  }

  leave() {
    if (this.connection) {
      this.connection.destroy();
      this.connection = null;
    }
  }

  async playGTTS(text) {
    const filePath = path.join(__dirname, "../data/temp_gtts.mp3");
    return new Promise((resolve, reject) => {
      gtts.save(filePath, text, () => {
        const resource = createAudioResource(filePath);
        this.player.play(resource);
        this.player.once(AudioPlayerStatus.Idle, () => resolve());
      });
    });
  }

  async playFile(filePath) {
    if (fs.existsSync(filePath)) {
      return new Promise((resolve) => {
        const resource = createAudioResource(filePath);
        this.player.play(resource);
        this.player.once(AudioPlayerStatus.Idle, () => resolve());
      });
    } else {
      console.warn(`File not found at ${filePath}`);
    }
  }

  async playWav(bossName) {
    const soundName = bossName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    const soundPath = path.join(__dirname, `../data/sounds/${soundName}.wav`);
    return this.playFile(soundPath);
  }

  isConnected() {
    return this.connection !== null;
  }
}

const voicePlayer = new VoicePlayer();
module.exports = voicePlayer;
