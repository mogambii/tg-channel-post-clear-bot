import { Api } from "telegram";
import bot, { activeSessions } from "./bot.js";
import { client } from "./client.js";

export async function handleDelall(ctx, message) {
  console.log("Handling /delall command");
  console.log("Chat ID:", message.chat.id);

  const channelId = message.chat.id;

  // Check if already clearing
  if (activeSessions.has(channelId)) {
    await ctx.reply("A clearing process is already running in this channel.");
    return;
  }

  try {
    activeSessions.set(channelId, true);
    await ctx.reply("🧹 Starting to clear all messages...");

    await checkAdminRights(channelId, ctx);
  } catch (error) {
    console.error("Error during message clearing:", error);
    console.error("Error stack:", error.stack);
    await ctx.reply(
      "❌ An error occurred while clearing messages.\n\n" +
        "Error: " +
        error.message
    );
  } finally {
    activeSessions.delete(channelId);
  }
}

async function checkAdminRights(channelId, ctx) {
  try {
    // Check if bot is admin
    const botmember = await bot.telegram.getChatMember(
      channelId,
      bot.botInfo.id
    );
    if (botmember.status !== "administrator") {
      return ctx.reply(
        "❌ I need to be an admin in this channel with permissions to delete messages."
      );
    }

    if (!botmember.can_promote_members || !botmember.can_delete_messages) {
      return ctx.reply(
        "❌ I need to be an admin in this channel with permissions to delete messages and promote members."
      );
    }

    // Check if userbot is admin
    const userbotmember = await bot.telegram.getChatMember(
      channelId,
      process.env.USERBOT_USER_ID
    );
    console.log("Userbot member status:", userbotmember);

    if (userbotmember.status === "left" || userbotmember.status === "kicked") {
      await addAndPromoteClientToChannel(channelId);
      await ctx.reply(
        "✅ Userbot has been added. Please promote @kenyanguy22 to admin with delete message permissions."
      );
      return;
    }

    if (userbotmember.status === "member") {
      await ctx.reply(
        "⚠️ Userbot (@kenyanguy22) is in the channel but not an admin.\n\n" +
          "Please promote @kenyanguy22 to admin with the following permissions:\n" +
          "• Delete messages\n\n" +
          "Then run /delall again."
      );
      return;
    }

    if (userbotmember.status === "administrator") {
      if (!userbotmember.can_delete_messages) {
        await ctx.reply(
          "⚠️ Userbot (@kenyanguy22) is an admin but lacks delete permissions.\n\n" +
            "Please grant @kenyanguy22 the following permission:\n" +
            "• Delete messages\n\n" +
            "Then run /delall again."
        );
        return;
      }

      // All checks passed, proceed with deletion
      await ctx.reply(
        "✅ All permissions verified. Starting message deletion..."
      );
      await deleteAllMessages(channelId, ctx);
    }
  } catch (error) {
    console.error("Error checking admin rights:", error);
    console.error("Error stack:", error.stack);
    await ctx.reply(
      "❌ An error occurred while checking admin rights.\n\n" +
        "Error: " +
        error.message
    );
  }
}

async function addAndPromoteClientToChannel(channelId) {
  const userId = Number(process.env.USERBOT_USER_ID);

  // 1. Check bot permissions
  const botMember = await bot.telegram.getChatMember(channelId, bot.botInfo.id);
  if (botMember.status !== "administrator" || !botMember.can_promote_members) {
    throw new Error("Bot lacks promote permissions");
  }

  // 2. Create invite
  const invite = await bot.telegram.createChatInviteLink(channelId, {
    member_limit: 1,
  });

  const hash = invite.invite_link.replace(
    /^https?:\/\/t\.me\/(\+|joinchat\/)/,
    ""
  );

  // 3. Userbot joins
  try {
    await client.invoke(new Api.messages.ImportChatInvite({ hash }));
    console.log("Userbot joined channel");
  } catch (e) {
    if (e.errorMessage !== "USER_ALREADY_PARTICIPANT") {
      throw e;
    }
    console.log("Userbot already in channel");
  }

  console.log("Userbot joined, awaiting manual promotion");
}

async function deleteAllMessages(channelId, ctx) {
  try {
    // Get the channel entity using the userbot client
    const channel = await client.getEntity(channelId);

    let deletedCount = 0;
    let lastUpdateCount = 0;
    const batchSize = 100;

    // Status message
    const statusMsg = await ctx.reply("🗑️ Deleting messages: 0 deleted...");

    // Get all message IDs using the userbot
    const messageIds = [];
    let offsetId = 0;

    // First, collect all message IDs
    await ctx.reply("📊 Scanning channel for messages...");

    while (true) {
      const messages = await client.invoke(
        new Api.messages.GetHistory({
          peer: channel,
          offsetId: offsetId,
          limit: 100,
          addOffset: 0,
          maxId: 0,
          minId: 0,
          hash: 0,
        })
      );

      if (!messages.messages || messages.messages.length === 0) {
        break;
      }

      for (const msg of messages.messages) {
        messageIds.push(msg.id);
      }

      offsetId = messages.messages[messages.messages.length - 1].id;

      // Update scan progress every 1000 messages
      if (messageIds.length % 1000 === 0) {
        await bot.telegram.editMessageText(
          channelId,
          statusMsg.message_id,
          null,
          `📊 Scanned ${messageIds.length} messages...`
        );
      }
    }

    await bot.telegram.editMessageText(
      channelId,
      statusMsg.message_id,
      null,
      `✅ Found ${messageIds.length} messages. Starting deletion...`
    );

    // Delete messages in batches
    for (let i = 0; i < messageIds.length; i += batchSize) {
      const batch = messageIds.slice(i, i + batchSize);

      try {
        await client.invoke(
          new Api.channels.DeleteMessages({
            channel: channel,
            id: batch,
          })
        );

        deletedCount += batch.length;

        // Update status every 500 deletions
        if (deletedCount - lastUpdateCount >= 500) {
          await bot.telegram.editMessageText(
            channelId,
            statusMsg.message_id,
            null,
            `🗑️ Deleting messages: ${deletedCount}/${messageIds.length} deleted...`
          );
          lastUpdateCount = deletedCount;
        }

        // Small delay to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(
          `Error deleting batch starting at message ${batch[0]}:`,
          error
        );
        // Continue with next batch even if one fails
      }
    }

    // Final status update
    await bot.telegram.sendMessage(
      channelId,
      `✅ Deletion complete! Total messages deleted: ${deletedCount}.`
    );
  } catch (error) {
    console.error("Error during message deletion:", error);
    throw error;
  }
}
