import 'dotenv/config';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { NewMessage } from 'telegram/events';
import { Api } from 'telegram/tl';

// Load environment variables
const apiId = parseInt(process.env.API_ID);
const apiHash = process.env.API_HASH;
const sessionString = process.env.TELEGRAM_SESSION;

if (!apiId || !apiHash || !sessionString) {
    console.error('Please set API_ID, API_HASH, and TELEGRAM_SESSION in your .env file');
    process.exit(1);
}

// Create the client
const client = new TelegramClient(
    new StringSession(sessionString),
    apiId,
    apiHash,
    {
        connectionRetries: 5,
    }
);

// Store active clearing sessions
const activeSessions = new Map();

// Command handlers
async function handleStart(event) {
    const message = event.message;
    await message.reply('Welcome! Use /clear to start clearing messages in a channel.');
}

async function handleClear(event) {
    const message = event.message;
    const userId = message.senderId;

    if (activeSessions.has(userId)) {
        await message.reply('You already have an active clearing session. Use /stop to cancel it first.');
        return;
    }

    activeSessions.set(userId, {
        isActive: true,
        lastMessageId: null
    });

    await message.reply('Please forward a message from the channel where you want to clear messages. I will delete all messages before that point.');
}

async function handleStop(event) {
    const message = event.message;
    const userId = message.senderId;

    if (activeSessions.has(userId)) {
        activeSessions.delete(userId);
        await message.reply('Clearing session stopped.');
    } else {
        await message.reply('No active clearing session found.');
    }
}

// Handle forwarded messages
async function handleForwardedMessage(event) {
    const message = event.message;
    const userId = message.senderId;
    const session = activeSessions.get(userId);

    if (!session || !session.isActive) return;

    if (message.forward) {
        const forwardedFrom = message.forward.fromId;
        if (forwardedFrom && forwardedFrom.className === 'PeerChannel') {
            const channelId = forwardedFrom.channelId;
            const messageId = message.forward.fromMessageId;

            try {
                // Check if user is admin in the channel
                const channel = await client.getEntity(channelId);
                const participant = await client.getParticipant(channel, userId);
                
                if (!['creator', 'admin'].includes(participant.rank)) {
                    activeSessions.delete(userId);
                    await message.reply('You need to be an administrator of the channel to clear messages.');
                    return;
                }

                // Start clearing messages
                await message.reply('Starting to clear messages...');
                await clearMessages(message, channelId, messageId, userId);
            } catch (error) {
                console.error('Error processing forwarded message:', error);
                await message.reply('An error occurred. Make sure you are an admin in the channel.');
                activeSessions.delete(userId);
            }
        } else {
            await message.reply('Please forward a message from a channel, not a private chat or group.');
        }
    } else {
        await message.reply('Please forward a message from the channel where you want to clear messages.');
    }
}

// Function to clear messages
async function clearMessages(message, channelId, endMessageId, userId) {
    const session = activeSessions.get(userId);
    if (!session) return;

    try {
        let deletedCount = 0;
        let skippedCount = 0;
        let currentMessageId = endMessageId - 1;
        const delayBetweenMessages = 100;
        let consecutiveErrors = 0;
        const maxConsecutiveErrors = 10;

        console.log(`Starting to clear messages in channel ${channelId} up to message ${endMessageId}`);

        while (currentMessageId > 0 && session.isActive) {
            try {
                await new Promise(resolve => setTimeout(resolve, delayBetweenMessages));

                // Try to delete the message
                await client.deleteMessages(channelId, [currentMessageId]);
                console.log(`Successfully deleted message ${currentMessageId}`);
                deletedCount++;
                consecutiveErrors = 0;

                // Send progress update every 20 messages
                if (deletedCount % 20 === 0) {
                    await message.reply(`Progress: Deleted ${deletedCount} messages, skipped ${skippedCount} messages...`);
                }
            } catch (error) {
                console.error(`Error deleting message ${currentMessageId}:`, error);
                skippedCount++;
                consecutiveErrors++;

                if (consecutiveErrors >= maxConsecutiveErrors) {
                    await message.reply('Stopping: Too many consecutive messages cannot be deleted. This might be because the messages are too old.');
                    break;
                }

                if (skippedCount % 50 === 0) {
                    await message.reply(`Progress: Deleted ${deletedCount} messages, skipped ${skippedCount} messages...`);
                }
            }
            currentMessageId--;
        }

        if (session.isActive) {
            await message.reply(`Finished: Successfully deleted ${deletedCount} messages, skipped ${skippedCount} messages.`);
        }
    } catch (error) {
        console.error('Error clearing messages:', error);
        await message.reply(`Error: ${error.message}`);
    } finally {
        activeSessions.delete(userId);
    }
}

// Start the client
async function startUserbot() {
    try {
        await client.connect();
        console.log('Userbot connected successfully!');

        // Add event handlers
        client.addEventHandler(handleStart, new NewMessage({ pattern: /^\/start$/ }));
        client.addEventHandler(handleClear, new NewMessage({ pattern: /^\/clear$/ }));
        client.addEventHandler(handleStop, new NewMessage({ pattern: /^\/stop$/ }));
        client.addEventHandler(handleForwardedMessage, new NewMessage({}));

        console.log('Userbot is ready!');
    } catch (error) {
        console.error('Error starting userbot:', error);
        process.exit(1);
    }
}

startUserbot(); 