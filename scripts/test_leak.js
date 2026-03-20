const { createAudioPlayer, AudioPlayerStatus } = require("@discordjs/voice");

const player = createAudioPlayer();

console.log("Adding listeners...");
for (let i = 0; i < 15; i++) {
  player.once(AudioPlayerStatus.Idle, () => {
    console.log(`Listener ${i} fired`);
  });
}

console.log(`Current listener count for 'idle': ${player.listenerCount(AudioPlayerStatus.Idle)}`);

if (player.listenerCount(AudioPlayerStatus.Idle) > 10) {
  console.log("REPRODUCED: Listener count exceeded 10.");
} else {
  console.log("NOT REPRODUCED.");
}

process.exit(0);
