# CS2 Skin Inspect Server & Web UI Generator

A local, lightweight utility to inspect and generate custom skins in Counter-Strike 2. This project features a C# server plugin (built with CounterStrikeSharp) and a Node.js web server that acts as a Steam inspect decoder and provides a premium web interface for customizing and sending skins directly to your local CS2 Dedicated Server.

## Features

- **In-game Chat Commands**: Spawns skins instantly using `!gen <defindex> <paintindex> <paintseed> <paintwear>` or `!i <inspect_link>`.
- **Skins Preset Database**: Features a dropdown autocomplete search list with **1,980+ official weapon and knife skins** (automatically synced via Steam/ByMykel CS2 API).
- **Visual Preview Card**: Instantly previews your customized skin, complete with high-resolution weapon thumbnails retrieved from the Steam community CDN.
- **Wear Float Clamping**: Automatically clamps the float sliders to match each skin's official wear boundaries (e.g. *AWP | Asiimov* float is capped from `0.18` to `1.00`).
- **RCON Direct Spawning**: Enter your SteamID64 and click "Send to Server" to instantly spawn the customized skin in your hand—no copy-pasting required!
- **Offline Mode fallback**: The inspect server decodes links offline using protobufs, allowing you to use the generator and manually paste commands even if your Steam bot credentials are not configured.

---

## Repository Structure

```text
├── public/                  # Static Web UI frontend files
│   ├── index.html           # Beautiful dark-themed Web UI
│   ├── style.css            # Responsive layout & custom glassmorphic styling
│   ├── app.js               # Frontend event handling, search filtering & RCON caller
│   └── skins.json           # Filtered CS2 weapons and skins metadata database
├── InspectBridge.cs         # CounterStrikeSharp C# Server Plugin Source Code
├── InspectBridge.csproj      # C# Project File for compiling the plugin
├── server.js                # Node.js backend inspect bot & RCON API server
├── .env.example             # Configuration template for port, Steam credentials, and RCON
├── .gitignore               # Configured to prevent committing sensitive files & build outputs
└── package.json             # Node.js dependencies (steam-user, rcon-client, express, etc.)
```

---

## Setup & Installation

### Step 1: CS2 Dedicated Server Prerequisites
1. Ensure your local CS2 Dedicated Server is running and has **Metamod:Source** and **CounterStrikeSharp** installed.
2. If not, follow the official installation guides:
   - [Metamod:Source Downloads](https://www.metamodsource.net/downloads.php?branch=master)
   - [CounterStrikeSharp Releases](https://github.com/roflmuffin/CounterStrikeSharp/releases) (Ensure you download the version `with-runtime` for your OS).

### Step 2: Compile & Deploy the C# Plugin
1. Install [.NET SDK 8.0](https://dotnet.microsoft.com/download/dotnet/8.0) on your machine.
2. In the project root directory, run the compile command:
   ```bash
   dotnet build
   ```
3. Copy the compiled plugin files from `bin/Debug/net8.0/` into your server's plugin directory:
   `C:\cs2_server\game\csgo\addons\counterstrikesharp\plugins\InspectBridge\`
   - Copy `InspectBridge.dll`
   - Copy `InspectBridge.deps.json`
   - Copy `InspectBridge.pdb`
4. **IMPORTANT**: Make sure there is no `InspectBridge.cs` file left in the server's `/InspectBridge/` folder to prevent dynamic compilation conflicts.

### Step 3: Configure the Web Backend
1. Install [Node.js](https://nodejs.org/) (version 18+).
2. In the project directory, install the required dependencies:
   ```bash
   npm install
   ```
3. Duplicate the `.env.example` file and rename it to `.env`:
   ```bash
   copy .env.example .env
   ```
4. Open `.env` and fill in the configuration:
   - `PORT`: Node server port (default: `3000`).
   - `STEAM_USERNAME` / `STEAM_PASSWORD`: (Optional) Steam account credentials if you want to connect to Steam Game Coordinator to inspect real market/inventory links. Leave as placeholders to run in offline generator mode.
   - `RCON_HOST`, `RCON_PORT`, `RCON_PASSWORD`: Your CS2 server RCON details (used for the "Send to Server" instant spawn button).

### Step 4: Run the Backend
Start the Node.js backend server:
```bash
npm start
```
Open **`http://localhost:3000`** in your browser (or inside the Steam overlay browser).

### Step 5: Start CS2 and Test
1. Start your CS2 Dedicated Server with RCON enabled:
   ```bash
   cd cs2_server\game\bin\win64
   cs2.exe -dedicated -console +map de_mirage +rcon_password your_rcon_password
   ```
2. Connect to the server in-game.
3. Open `http://localhost:3000`, customize a skin, and:
   - **Method A**: Copy the **Direct Chat Command** (e.g. `!gen 7 44 661 0.05`) and paste it into the game chat.
   - **Method B**: Input your SteamID64 and click **Send to Server** to see it equip instantly!

---

## Disclaimer
Using plugins to modify weapon skins and knives on public servers may violate Valve's Game Server Login Token (GSLT) rules and can result in server bans. This plugin is designed for local, offline, or private testing/practice purposes only. Use at your own risk.
