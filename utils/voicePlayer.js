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
    this.queue = [];
    this.isProcessing = false;

    // persistent listener to process next item in queue
    this.player.on(AudioPlayerStatus.Idle, () => {
      this._processQueue();
    });

    // persistent listener for errors to prevent process crash
    this.player.on("error", (error) => {
      console.error("AudioPlayer Error:", error);
      this._processQueue();
    });
  }

  async _processQueue() {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const { resource, resolve } = this.queue.shift();

    // We store the resolver in case we need it, but the Idle listener handles it mostly
    this._currentResolver = resolve;

    try {
      this.player.play(resource);
    } catch (error) {
      console.error("Error playing resource:", error);
      this._resolveCurrentPlayback();
      this._processQueue();
    }
  }

  _resolveCurrentPlayback() {
    if (this._currentResolver) {
      this._currentResolver();
      this._currentResolver = null;
    }
  }

  async _enqueue(resource) {
    return new Promise((resolve) => {
      this.queue.push({ resource, resolve });
      if (
        !this.isProcessing &&
        this.player.state.status === AudioPlayerStatus.Idle
      ) {
        this._processQueue();
      }
    });
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
      if (this.connection) {
        this.connection.destroy();
        this.connection = null;
      }
      return false;
    }
  }

  leave() {
    this.queue = [];
    this._resolveCurrentPlayback();
    if (this.connection) {
      this.connection.destroy();
      this.connection = null;
    }
    this.player.stop();
  }

  async playGTTS(text) {
    const filePath = path.join(__dirname, "../data/temp_gtts.mp3");
    return new Promise((resolve) => {
      gtts.save(filePath, text, async () => {
        try {
          const resource = createAudioResource(filePath);
          await this._enqueue(resource);
          resolve();
        } catch (error) {
          console.error("Error playing GTTS:", error);
          resolve();
        }
      });
    });
  }

  async playFile(filePath) {
    if (fs.existsSync(filePath)) {
      try {
        const resource = createAudioResource(filePath);
        await this._enqueue(resource);
      } catch (error) {
        console.error(`Error playing file ${filePath}:`, error);
      }
    } else {
      console.warn(`File not found at ${filePath}`);
    }
  }

  async playWav(bossName) {
    const soundName = bossName
      .replace(/([a-z])([A-Z])/g, "$1_$2")
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
