# WhatsApp Anime Bot

A WhatsApp bot built with Node.js that provides various anime and manga related features, sticker creation, and more.

## Features

- Search for anime and manga information using Anilist.
- Get lyrics for songs.
- Convert images and videos to WhatsApp stickers.
- Fetch anime news.
- User profiles and subscriptions.
- Customizable command prefix.

## Prerequisites

- Node.js installed
- A WhatsApp account to run the bot
- FFmpeg installed (for video sticker conversion)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/AsifShinzo/rias-bot.git
   cd whatsapp-anime-bot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory and add necessary environment variables (e.g., API keys, bot number). Refer to the code for required variables.

4. Link your WhatsApp account:
   Run the bot for the first time to link your WhatsApp account by scanning the QR code.

## Usage

1. Start the bot:
   ```bash
   node bot.js
   ```

2. Interact with the bot on WhatsApp using the configured command prefix.

## Project Structure

- `bot.js`: Main bot file.
- `anilist.js`: Handles interactions with the Anilist API.
- `features/`: Contains modules for different bot features (anime, manga, sticker, etc.).
- `auth_info/`: Stores WhatsApp authentication information.
- `assets/`: Contains assets used by the bot.
- `profiles.json`: Stores user profile data.
- `subscriptions.json`: Stores user subscriptions.
- `stickers.json`: Stores sticker data.
- `prefixConfig.json`: Stores custom prefix configurations.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the MIT License.
