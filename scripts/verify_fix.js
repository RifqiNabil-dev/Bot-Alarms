const voicePlayer = require("../utils/voicePlayer");
const { AudioPlayerStatus } = require("@discordjs/voice");

console.log("Initial listener count for 'idle':", voicePlayer.player.listenerCount(AudioPlayerStatus.Idle));

async function runTest() {
  console.log("Triggering 15 rapid playFile calls...");
  
  // Note: we don't await them since we want to see if listeners pile up during the "trigger" phase
  // Actually, playFile now returns a promise that resolves when it's DONE playing.
  // But the listeners should be attached only once in the constructor.
  
  const promises = [];
  for (let i = 0; i < 15; i++) {
    promises.push(voicePlayer.playFile("non-existent-file.mp3")); 
    // Even if it doesn't exist, it should not add listeners anymore because we refactored
  }

  console.log("Listener count after triggers:", voicePlayer.player.listenerCount(AudioPlayerStatus.Idle));

  if (voicePlayer.player.listenerCount(AudioPlayerStatus.Idle) === 1) {
    console.log("SUCCESS: Listener count remains 1.");
  } else {
    console.log(`FAILURE: Listener count is ${voicePlayer.player.listenerCount(AudioPlayerStatus.Idle)}`);
  }

  process.exit(0);
}

runTest();
