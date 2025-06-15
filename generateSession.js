import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import input from 'input';
import dotenv from 'dotenv';
dotenv.config();

async function generateSession() {
    console.log('Starting session generation...');
    
        // Get API credentials
        const apiId = process.env.API_ID;
    const apiHash = process.env.API_HASH;
    
    // Create a new client
    const client = new TelegramClient(
        new StringSession(''), // Empty string for new session
        parseInt(apiId),
        apiHash,
        {
            connectionRetries: 5,
        }
    );

    try {
        // Start the client
        await client.start({
            phoneNumber: async () => await input.text('Enter your phone number (with country code): '),
            password: async () => await input.text('Enter your 2FA password (if enabled): '),
            phoneCode: async () => await input.text('Enter the code you received: '),
            onError: (err) => console.log(err),
        });

        // Get the session string
        const sessionString = client.session.save();
        console.log('\nYour session string:');
        console.log(sessionString);
        console.log('\nSave this string in your .env file as TELEGRAM_SESSION');

        // Disconnect the client
        await client.disconnect();
    } catch (err) {
        console.error('Error generating session:', err);
    }
}

generateSession(); 