const { Client, GatewayIntentBits, Collection, Events } = require("discord.js");
const { runScheduler } = require("./utils/scheduler");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
  ],
});

client.commands = new Collection();
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
  }
}

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
  await runScheduler(readyClient);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error("Error executing command:", error);

    // Use a safe way to reply to the interaction
    const errorMessage = {
      content: "There was an error while executing this command!",
      flags: 64,
    }; // Using flags: 64 for ephemeral

    if (interaction.replied || interaction.deferred) {
      await interaction
        .followUp(errorMessage)
        .catch((err) => console.error("Failed to follow up:", err));
    } else {
      await interaction
        .reply(errorMessage)
        .catch((err) => console.error("Failed to reply:", err));
    }
  }
});

// Prevent process from crashing on unhandled rejections
process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});

client.login(process.env.DISCORD_TOKEN);
