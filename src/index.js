import dotenv from 'dotenv';
dotenv.config();
import { Telegraf } from 'telegraf';
const token = process.env.BOT_TOKEN;
const apiServerUrl = process.env.API_SERVER_URL;
console.log(token, apiServerUrl);


// Initialize bot with custom API server
const bot = new Telegraf(token, {
    telegram: {
        apiRoot: apiServerUrl || 'https://api.telegram.org'
    }
});

// Store active clearing sessions
const activeSessions = new Map();

// Command to start clearing messages
bot.command('start', (ctx) => {
    ctx.reply('Welcome! Use /clear to start clearing messages in a channel.');
});

// Command to start clearing messages
bot.command('clear', async (ctx) => {
    const userId = ctx.from.id;
    
    // Check if user already has an active session
    if (activeSessions.has(userId)) {
        return ctx.reply('You already have an active clearing session. Use /stop to cancel it first.');
    }

    // Create new session
    activeSessions.set(userId, {
        isActive: true,
        lastMessageId: null
    });

    ctx.reply('Please forward a message from the channel where you want to clear messages. I will delete all messages before that point.');
});

// Command to stop clearing
bot.command('stop', (ctx) => {
    const userId = ctx.from.id;
    if (activeSessions.has(userId)) {
        activeSessions.delete(userId);
        ctx.reply('Clearing session stopped.');
    } else {
        ctx.reply('No active clearing session found.');
    }
});

// Handle forwarded messages
bot.on('message', async (ctx) => {
    const userId = ctx.from.id;
    const session = activeSessions.get(userId);

    if (!session || !session.isActive) return;

    // Check if the message is from a channel
    if (ctx.message.forward_from_chat && ctx.message.forward_from_chat.type === 'channel') {
        const channelId = ctx.message.forward_from_chat.id;
        const messageId = ctx.message.forward_from_message_id;

        // Check if user is admin in the channel
        try {
            const chatMember = await ctx.telegram.getChatMember(channelId, userId);
            if (!['creator', 'administrator'].includes(chatMember.status)) {
                activeSessions.delete(userId);
                return ctx.reply('You need to be an administrator of the channel to clear messages.');
            }

            // Store the last message ID
            session.lastMessageId = messageId;
            session.channelId = channelId;

            // Start clearing messages
            ctx.reply('Starting to clear messages...');
            await clearMessages(ctx, channelId, messageId, userId);
        } catch (error) {
            console.error('Error:', error);
            ctx.reply('An error occurred. Make sure I am an admin in the channel and have delete message permissions.');
            activeSessions.delete(userId);
        }
    }
});

// Function to clear messages
async function clearMessages(ctx, channelId, endMessageId, userId) {
    const session = activeSessions.get(userId);
    if (!session) return;

    try {
        let currentMessageId = 1; // Start from the first message
        let deletedCount = 0;
        let failedCount = 0;
        const maxFailedAttempts = 5; // Maximum number of consecutive failed attempts

        while (currentMessageId < endMessageId && session.isActive) {
            try {
                await ctx.telegram.deleteMessage(channelId, currentMessageId);
                deletedCount++;
                failedCount = 0; // Reset failed count on success
                
                // Send progress update every 100 messages
                if (deletedCount % 100 === 0) {
                    ctx.reply(`Progress: Deleted ${deletedCount} messages so far...`);
                }
            } catch (error) {
                if (error.description === 'Bad Request: message to delete not found') {
                    // Message doesn't exist, continue to next
                    currentMessageId++;
                    continue;
                }
                failedCount++;
                if (failedCount >= maxFailedAttempts) {
                    throw new Error('Too many consecutive failed attempts');
                }
                // Add a small delay on error to prevent overwhelming the server
                await new Promise(resolve => setTimeout(resolve, 1000));
                continue;
            }
            currentMessageId++;
        }

        if (session.isActive) {
            ctx.reply(`Successfully deleted ${deletedCount} messages.`);
        }
    } catch (error) {
        console.error('Error clearing messages:', error);
        ctx.reply('An error occurred while clearing messages.');
    } finally {
        activeSessions.delete(userId);
    }
}

// Error handling
bot.catch((err, ctx) => {
    console.error('Bot error:', err);
    ctx.reply('An error occurred. Please try again later.');
});

// Start the bot
bot.launch()
    .then(() => console.log('Bot started successfully'))
    .catch((err) => console.error('Error starting bot:', err));

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM')); 