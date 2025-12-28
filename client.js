import dotenv from "dotenv";
dotenv.config();
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";

export const client = new TelegramClient(
  new StringSession(process.env.TELEGRAM_SESSION || ""),
  parseInt(process.env.TELEGRAM_API_ID),
  process.env.TELEGRAM_API_HASH,
  {
    connectionRetries: 5,
  }
);
