import { Telegraf } from "telegraf";
import dotenv from "dotenv";
import { handleDelall } from "./handleDellAll.js";

dotenv.config();

// Bot configuration
const bot = new Telegraf(process.env.BOT_TOKEN);

// Store active clearing sessions
export const activeSessions = new Map();

// Store userbot info globally
let userbotInfo = null;

// Start command
bot.command("start", async (ctx) => {
  console.log("Received /start command");
  const welcomeMsg =
    "Welcome! Add me to a channel as admin, then use /delall to clear all messages.\n\n" +
    "⚠️ Warning: This will delete ALL messages in the channel!\n\n" +
    "Important setup steps:\n" +
    "1. Add this bot to your channel as admin\n" +
    "2. Give the bot permission to read messages and add admins\n" +
    "3. Add your userbot account to the channel\n" +
    "4. The bot will automatically promote the userbot with delete permissions";

  await ctx.reply(welcomeMsg);
});

// Handle channel posts
bot.on("channel_post", async (ctx) => {
  console.log("Received channel post");
  const text = ctx.channelPost.text;

  if (!text) return;

  if (text.startsWith("/delall")) {
    await handleDelall(ctx, ctx.channelPost);
  } else if (text.startsWith("/start")) {
    await ctx.reply(
      "Welcome! Use /delall in this channel to clear all messages.\n\n" +
        "⚠️ Warning: This will delete ALL messages in the channel!"
    );
  } else if (text.startsWith("/stop")) {
    await handleStop(ctx, ctx.channelPost.chat.id);
  }
});

// Stop command handler
async function handleStop(ctx, channelId) {
  const chatId = channelId || ctx.chat?.id || ctx.channelPost?.chat?.id;

  if (activeSessions.has(chatId)) {
    activeSessions.delete(chatId);
    await ctx.reply("⛔ Clearing process stopped.");
  } else {
    await ctx.reply("ℹ️ No active clearing process found.");
  }
}

// Regular command handler for private chats
bot.command("delall", async (ctx) => {
  if (ctx.chat.type === "private") {
    await ctx.reply(
      "⚠️ This command can only be used in channels.\n\n" +
        "Please add me to a channel and use the command there."
    );
    return;
  }
});

// Error handling
bot.catch((err, ctx) => {
  console.error("Bot error:", err);
  ctx
    .reply("An unexpected error occurred: " + err.message)
    .catch(console.error);
});

export default bot;
