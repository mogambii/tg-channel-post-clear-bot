# Telegram Channel Message Clear Bot

A Telegram bot that helps clear messages in channels. The bot supports multiple users simultaneously and includes safety checks to ensure only channel administrators can clear messages.

## Features

- Clear messages in channels before a specific point
- Support for multiple users simultaneously
- Safety checks for administrator permissions
- Custom API server support to remove rate limits
- Progress updates during message deletion
- Session management for each user

## Setup

1. Create a new bot using [@BotFather](https://t.me/BotFather) on Telegram
2. Get your bot token from BotFather
3. Clone this repository
4. Install dependencies:
   ```bash
   npm install
   ```
5. Create a `.env` file in the root directory and add your bot token and API server URL:
   ```
   BOT_TOKEN=your_bot_token_here
   API_SERVER_URL=your_custom_api_server_url_here
   ```
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

- Node.js 12 or higher
- npm or yarn
- Telegram Bot Token
- Custom API Server URL (optional, but recommended for removing rate limits)
- Bot must be an administrator in the target channel
- User must be an administrator in the target channel

## Safety Features

- Only channel administrators can clear messages
- Error handling with retry mechanism
- Progress updates during deletion
- Session management to prevent conflicts
- Error handling for various scenarios

## Development

For development with auto-reload:
```bash
npm run dev
```

## Custom API Server

The bot supports using a custom API server to remove Telegram's rate limits. To use this feature:

1. Set up your custom API server
2. Add the API server URL to your `.env` file:
   ```
   API_SERVER_URL=https://your-api-server.com
   ```
3. The bot will automatically use your custom API server for all requests

If no custom API server is specified, the bot will use the default Telegram API server. 