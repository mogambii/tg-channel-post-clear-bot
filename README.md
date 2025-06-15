# Telegram Channel Message Clear Bot

A Telegram bot that helps clear messages in channels. This bot uses a userbot in the background to delete messages, which allows it to delete older messages that regular bots cannot delete.

## Features

- Clear messages in channels before a specific point
- Support for multiple users simultaneously
- Can delete older messages that regular bots cannot delete
- Safety checks for administrator permissions
- Progress updates during message deletion
- Session management for each user

## Setup

1. Get your API credentials:
   - Go to https://my.telegram.org/auth
   - Log in with your phone number
   - Go to 'API development tools'
   - Create a new application
   - Note down your `api_id` and `api_hash`

2. Create a new bot:
   - Message [@BotFather](https://t.me/BotFather) on Telegram
   - Use the `/newbot` command to create a new bot
   - Follow the instructions and get your bot token

3. Install dependencies:
   ```bash
   npm install
   ```

4. Create a `.env` file in the root directory with your credentials:
   ```
   API_ID=your_api_id
   API_HASH=your_api_hash
   BOT_TOKEN=your_bot_token
   ```

5. Generate a session:
   ```bash
   npm run generate-session
   ```
   - Follow the prompts to enter your phone number and verification code
   - Copy the generated session string
   - Add it to your `.env` file as `TELEGRAM_SESSION=your_session_string`

6. Start the bot:
   ```bash
   npm start
   ```

## Usage

1. Start a chat with your bot
2. Use `/start` to get started
3. Use `/clear` to begin the clearing process
4. Forward a message from the channel where you want to clear messages
5. The bot will delete all messages before the forwarded message
6. Use `/stop` to cancel the clearing process

## Requirements

- Node.js 16 or higher
- Telegram API credentials (api_id and api_hash)
- Telegram Bot Token
- Telegram account with admin rights in the target channel

## Safety Features

- Only channel administrators can clear messages
- Error handling with retry mechanism
- Progress updates during deletion
- Session management to prevent conflicts
- Error handling for various scenarios

## Important Notes

1. The bot uses a userbot in the background to delete messages
2. Be careful with the session string - anyone with it can access your account
3. The bot can delete older messages that regular bots cannot delete
4. Make sure you have the necessary permissions in the channel
5. Use responsibly and in accordance with Telegram's terms of service

## Development

To modify the code:
1. Edit the `bot.js` file
2. Restart the bot with `npm start`
3. For development with auto-reload, use `npm run dev` 