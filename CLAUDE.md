# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Wagmi Friends is a macOS menu bar app built with Electron that shows which friends are currently online ("locked in"). It uses Supabase for real-time presence tracking and displays friend status via a system tray icon.

## Architecture

### Main Components

- **main.js**: Single-file Electron app containing all application logic
  - Tray icon management with emoji display
  - Supabase client for real-time presence tracking
  - User configuration persistence (stored in userData directory)
  - Heartbeat system (30 second intervals) to maintain online status
  - Menu refresh system with real-time updates via Supabase channels

### Data Flow

1. On startup, app loads or prompts for user name via macOS dialog
2. Creates Supabase client and subscribes to `users` table changes
3. Sends periodic heartbeats to update `updated_at` timestamp
4. Menu displays users with `updated_at` within last 2 minutes as "online"
5. Real-time updates via Supabase channel trigger menu refreshes

### Key Files

- **main.js**: All application logic (tray, Supabase, heartbeat, menu)
- **user-config.json**: Stored in Electron userData directory, persists user name and ID
- **Template.png/iconTemplate.png**: App icon assets

## Development Commands

```bash
# Run the app in development
npm start

# Build for macOS (creates DMG installer)
npm run build
```

## Supabase Schema

The app expects a `users` table with:
- `id` (auto-generated)
- `name` (text)
- `status` (text, e.g., "cooking", "idle")
- `updated_at` (timestamp)

Users are considered online if `updated_at` is within the last 2 minutes.

## Platform-Specific Notes

- Uses macOS `osascript` for name prompt dialog
- Single instance lock prevents multiple app instances
- Tray emoji can be changed by modifying the `tray.setTitle()` call
