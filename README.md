# CS2 Skin Inspect Server and Web UI Generator

A lightweight Counter-Strike 2 inspect server utility and modern web dashboard. This project bridges a C# server plugin (built with CounterStrikeSharp and .NET 8) and a Node.js web server to allow players to customize, preview, and generate weapon skins or knives in-game instantly with high precision and accurate visual fidelity.

---

## Features

* **In-Game Chat Commands**: Spawn customized weapon skins or knives instantly in-game using `!gen <defindex> <paintindex> <paintseed> <paintwear>`.
* **High-Precision Wear Rating**: Supports up to 14 decimal places (e.g., `0.18000000000000`) for wear floats, letting players simulate precise collector-grade wear values.
* **1,980+ Official Skins Database**: Includes a built-in search and autocomplete dropdown menu with high-resolution weapon images, matching official paint kit IDs and wear boundaries automatically.
* **Legacy CS:GO Paint Kit Compatibility**: Automatically toggles the weapon bodygroup to the legacy model mesh (`body,1`) for paint kits below ID 1150 (such as Asiimov or Case Hardened) to ensure correct texture UV mapping and accurate visual rendering.
* **Cross-Locale Float Parsing**: Parses float values using invariant culture, ensuring the plugin runs seamlessly on host servers configured with different regional number formatting (where commas are used as decimal separators).
* **Automated Practice Sandbox**: Configures the game server settings on map start to set up the ultimate inspect environment (enables cheats, 60-minute rounds, buy anywhere, infinite money, and scales player damage to 0 to prevent combat).
* **Offline-First Protobuf Encoder**: Encodes skin parameters into a valid Steam inspect link offline using protobufs, allowing the generator to work instantly without needing Steam account credentials.

---

## Repository Structure

```text
├── public/                  # Web Dashboard Frontend
│   ├── index.html           # Glassmorphic, modern dark-themed user interface
│   ├── style.css            # Responsive styles and micro-animations
│   ├── app.js               # Event handling, autocomplete search, and API calls
│   └── skins.json           # Local cache of 1,980+ official CS2 weapon skins
├── InspectBridge.cs         # CounterStrikeSharp C# Plugin (Server-side logic)
├── InspectBridge.csproj      # .NET 8 Project file for compilation
├── server.js                # Node.js backend (Static host & offline inspect API)
├── .env.example             # Environment configuration file template
└── package.json             # Backend dependencies (express, cs2-inspect-lib, etc.)
```

---

## Installation & Setup

### 1. CS2 Server Prerequisites
Make sure your CS2 Dedicated Server has Metamod:Source and CounterStrikeSharp (CSS) installed.
* [Metamod:Source](https://www.metamodsource.net/downloads.php?branch=master)
* [CounterStrikeSharp](https://github.com/roflmuffin/CounterStrikeSharp/releases) (Ensure you grab the version with-runtime).

### 2. Compile and Deploy the C# Plugin
1. Install [.NET SDK 8.0](https://dotnet.microsoft.com/download/dotnet/8.0).
2. Open a terminal in the project root and run:
   ```bash
   dotnet build
   ```
3. Copy the compiled files from `bin/Debug/net8.0/` into your server's plugin directory:
   `D:\cs2_server\game\csgo\addons\counterstrikesharp\plugins\InspectBridge\`
   * Copy `InspectBridge.dll`
   * Copy `InspectBridge.deps.json`
   * Copy `InspectBridge.pdb`
4. *Note: Ensure no `InspectBridge.cs` file is left in the server plugin directory to avoid compiler conflicts.*

### 3. Run the Node.js Web Dashboard
1. Install [Node.js](https://nodejs.org/) (v18+).
2. Install dependencies:
   ```bash
   npm install
   ```
3. Duplicate `.env.example` and name it `.env`:
   ```bash
   copy .env.example .env
   ```
4. Start the server:
   ```bash
   npm start
   ```
5. Open your browser and navigate to `http://localhost:3000` (or open it in the Steam Overlay browser in-game).

---

## How to Use in Game

1. Connect to your local or private CS2 dedicated server (e.g., `connect localhost:27015`).
2. Open the Web UI (`http://localhost:3000`).
3. Search for a skin (e.g., "Asiimov" or "Case Hardened"), adjust the seed/wear, and click **Copy** next to **Gencode In-Game Chat Command**.
4. In-game, press your chat key (default: `Y`) and paste the command (e.g., `!gen 7 44 661 0.05000000000000`).
5. The server plugin automatically:
   * Identifies the category slot (Primary, Pistol, Knife, or Zeus).
   * Safely clears any existing weapon in that slot.
   * Spawns the new weapon, configures its attributes, applies the legacy 3D mesh if necessary, and forces the player to equip it.

---

## Disclaimer
Modifying weapon skins on public game coordinator-connected servers can violate Valve's Game Server Login Token (GSLT) rules. This utility is designed strictly for local testing, private sandbox environments, and educational/practice purposes. Use responsibly.
