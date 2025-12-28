import bot from "./bot.js";
import { client } from "./client.js";

async function startBot() {
  try {
    // Start the userbot client
    console.log("Starting userbot client...");
    await client.start();
    console.log("✅ Userbot client connected successfully");


    // Get and log userbot info - store globally
   const userbotInfo = await client.getMe();
    console.log(
      "Userbot logged in as:",
      userbotInfo.username || userbotInfo.firstName,
      `(ID: ${userbotInfo.id})`
    );

    // Start the bot
    console.log("Starting Telegram bot...");
    await bot.launch();
    console.log("✅ Bot started successfully");
    console.log("🤖 Bot is now running and ready to receive commands!");

    // Enable graceful stop
    process.once("SIGINT", async () => {
      console.log("\nStopping bot...");
      await bot.stop("SIGINT");
      await client.disconnect();
      process.exit(0);
    });
    process.once("SIGTERM", async () => {
      console.log("\nStopping bot...");
      await bot.stop("SIGTERM");
      await client.disconnect();
      process.exit(0);
    });
  } catch (error) {
    console.error("❌ Error starting the bot:", error);
    console.error("Error details:", error.message);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  }
}

startBot().catch((error) => {
  console.error("💥 Fatal error in startBot:", error);
  process.exit(1);
});
