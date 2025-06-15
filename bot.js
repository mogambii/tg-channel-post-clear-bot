import { Telegraf } from 'telegraf';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import dotenv from 'dotenv';
import { Api } from 'telegram';
import https from 'https';

dotenv.config();


const httpsAgent = new https.Agent({
    keepAlive: true,
    keepAliveMsecs: 30000,
    maxSockets: 50,
    maxFreeSockets: 20,
    timeout: 60000,
    freeSocketTimeout: 30000,
    scheduling: 'fifo'
});

const apiRoot = process.env.API_SERVER_URL || 'https://api.telegram.org';

const bot = new Telegraf(process.env.BOT_TOKEN, {
    telegram: {
        apiRequestTimeout: 3600000,
        apiRoot: apiRoot,
        uploadFileMaxSize: 2000 * 1024 * 1024,
        agent: httpsAgent,
        fileUploadOptions: {
            chunkSize: 2 * 1024 * 1024,
            timeout: 3600000,
            retries: 5
        },
        webhookTimeout: 3600000
    },
    handlerTimeout: 3600000,
    client: {
        timeout: 3600000,
        timeoutErrorMessage: "Request timed out after 1 hour",
    },
});

// Initialize userbot client
const client = new TelegramClient(
    new StringSession(process.env.TELEGRAM_SESSION),
    parseInt(process.env.API_ID),
    process.env.API_HASH,
    {
        connectionRetries: 5,
    }
);

// Store active sessions
const activeSessions = new Map();

// Start command
bot.command('start', async (ctx) => {
    const userId = ctx.from.id;
    if (activeSessions.has(userId)) {
        await ctx.reply('You already have an active session. Use /stop to end it first.');
        return;
    }

    activeSessions.set(userId, {
        isClearing: false,
        channelId: null,
        lastMessageId: null
    });

    await ctx.reply(
        'Welcome! I can help you clear messages in your channels.\n\n' +
        'To start clearing messages:\n' +
        '1. Use /clear to begin\n' +
        '2. Forward a message from the channel where you want to clear messages\n' +
        '3. I will delete all messages before the forwarded message\n\n' +
        'Use /stop to cancel the clearing process at any time.'
    );
});

// Clear command
bot.command('clear', async (ctx) => {
    const userId = ctx.from.id;
    const session = activeSessions.get(userId);

    if (!session) {
        await ctx.reply('Please use /start first to initialize a session.');
        return;
    }

    if (session.isClearing) {
        await ctx.reply('A clearing session is already in progress. Use /stop to cancel it first.');
        return;
    }

    session.isClearing = true;
    await ctx.reply('Please forward a message from the channel where you want to clear messages.');
});

// Stop command
bot.command('stop', async (ctx) => {
    const userId = ctx.from.id;
    const session = activeSessions.get(userId);

    if (!session) {
        await ctx.reply('No active session found. Use /start to begin.');
        return;
    }

    if (!session.isClearing) {
        await ctx.reply('No clearing session is in progress.');
        return;
    }

    session.isClearing = false;
    session.channelId = null;
    session.lastMessageId = null;
    await ctx.reply('Clearing process stopped.');
});

// Handle forwarded messages
bot.on('message', async (ctx) => {
    const userId = ctx.from.id;
    const session = activeSessions.get(userId);

    if (!session || !session.isClearing) {
        return;
    }

    const message = ctx.message;
    if (!message.forward_from_chat) {
        await ctx.reply('Please forward a message from the channel where you want to clear messages.');
        return;
    }

    const channelId = message.forward_from_chat.id;
    const lastMessageId = message.forward_from_message_id;

    try {
        // Check if the user is an admin in the channel
        const channel = await client.getEntity(channelId);
        const fullChannel = await client.invoke(new Api.channels.GetFullChannel({
            channel: channel
        }));
        
        const participant = fullChannel.fullChat.participants?.participants.find(
            p => p.userId === userId
        );
        
        // Check if user is owner or admin
        const isOwner = channel.creator;
        const isAdmin = participant?.adminRights;
        
        if (!isOwner && !isAdmin) {
            await ctx.reply('You must be an administrator or owner in the channel to clear messages.');
            session.isClearing = false;
            return;
        }

        await ctx.reply('Starting to clear messages...');

        let deletedCount = 0;
        let failedCount = 0;
        let hasMoreMessages = true;
        let currentMessageId = lastMessageId;

        while (hasMoreMessages) {
            // Get messages in batches of 100
            const messages = await client.getMessages(channelId, {
                limit: 100,
                maxId: currentMessageId
            });

            if (messages.length === 0) {
                hasMoreMessages = false;
                continue;
            }

            // Update the last message ID for the next batch
            currentMessageId = messages[messages.length - 1].id;

            for (const msg of messages) {
                try {
                    await client.invoke(new Api.channels.DeleteMessages({
                        channel: channelId,
                        id: [msg.id]
                    }));
                    deletedCount++;
                    
                    // Send progress update every 10 messages
                    if (deletedCount % 10 === 0) {
                        await ctx.reply(`Progress: ${deletedCount} messages deleted`);
                    }
                } catch (error) {
                    console.error(`Failed to delete message ${msg.id}:`, error);
                    failedCount++;
                }
            }

            // Add a small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        await ctx.reply(
            `Message clearing completed!\n` +
            `Successfully deleted: ${deletedCount} messages\n` +
            `Failed to delete: ${failedCount} messages`
        );

    } catch (error) {
        console.error('Error during message clearing:', error);
        await ctx.reply('An error occurred while clearing messages. Please try again.');
    } finally {
        session.isClearing = false;
        session.channelId = null;
        session.lastMessageId = null;
    }
});

// Start the bot
async function startBot() {
    try {
        // Start the userbot client
        await client.start();
        console.log('Userbot client started successfully');

        // Start the bot
        await bot.launch();
        console.log('Bot started successfully');

        // Enable graceful stop
        process.once('SIGINT', () => bot.stop('SIGINT'));
        process.once('SIGTERM', () => bot.stop('SIGTERM'));
    } catch (error) {
        console.error('Error starting the bot:', error);
        process.exit(1);
    }
}

startBot(); 