# Wagmi Friends 🍳

A macOS menu bar app that shows which friends are currently online ("locked in").

## Installation

1. Download the latest `Wagmi-Friends-0.0.2.dmg` from [Releases](https://github.com/YOUR_USERNAME/wagmi-friends/releases)
2. Open the DMG file
3. Drag the app to your Applications folder
4. Open the app from Applications
5. You'll be prompted to enter your name on first launch

## Usage

- The app lives in your menu bar (shows a 🍳 icon)
- Click the icon to see which friends are online
- Set your status to "cooking" (active) or "idle"
- Friends who haven't been active in the last 2 minutes won't show up

## For Developers

### Running from source

```bash
npm install
npm start
```

### Building

```bash
npm run build
```

This creates a DMG installer in the `dist/` folder.

## Requirements

- macOS
- Internet connection (uses Supabase for real-time presence)
