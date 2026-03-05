# Codenames Duet

A web-based implementation of the Codenames Duet board game using TypeScript and Firebase.

## Tech Stack

- **Frontend**: TypeScript, HTML5, CSS3
- **Build Tool**: Vite
- **Backend**: Firebase (Firestore, Authentication)
- **Authentication**: Firebase Anonymous Auth

## Features Implemented

### 1. Homepage
- Game title and subtitle display
- **Create Lobby** button - generates a new game lobby
- **Join Lobby** section with:
  - 6-character invite code input
  - Join button

### 2. Lobby Creation
- Generates unique 6-character lobby codes
- Shows lobby page immediately (no loading delays)
- Displays invite code with **Copy to Clipboard** button
- Real-time player list updates using Firestore `onSnapshot`
- Player name editing (click Save or press Enter)
- Default names: "Player 1" (Host), "Player 2" (Joiner)

### 3. Joining Lobbies
- Enter 6-character invite code
- Validates lobby exists
- Checks if lobby is full (max 2 players)
- Prevents duplicate joins
- Adds player to lobby in real-time

### 4. Lobby Features
- **Host View**:
  - Shows invite code with copy button
  - Player list with host badge
  - Name editing for own player
  - Placeholder game settings (Difficulty, Timer)
  - Start Game button (disabled until 2 players)
  
- **Player View**:
  - Shows joined lobby code
  - Player list with host badge
  - Name editing for own player
  - Placeholder game settings
  - "Waiting for host to start" message

### 5. Real-time Updates
- Firestore `onSnapshot` listeners for live lobby updates
- Both players see each other immediately
- Name changes sync in real-time
- Player join/leave updates instantly

## Project Structure

```
├── index.html          # Main HTML with CSS styles
├── src/
│   ├── main.ts        # Main application logic
│   └── firebase.ts    # Firebase configuration (ignored in git)
├── package.json       # Dependencies
├── tsconfig.json      # TypeScript config
└── .gitignore         # Git ignore rules
```

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Firebase Configuration
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Register a web app
4. Enable **Authentication** → **Anonymous** sign-in
5. Enable **Firestore Database** (start in test mode)
6. Copy Firebase config to `src/firebase.ts`

### 3. Run Development Server
```bash
npm run dev
```

### 4. Build for Production
```bash
npm run build
```

## Testing Multiplayer

Since Firebase Auth persists across browser tabs, test with:
- **Option 1**: Host in regular window, Joiner in Incognito/Private window
- **Option 2**: Use different browsers (Chrome + Firefox)
- **Option 3**: Different devices on same network

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Game Settings (Placeholders)

- **Difficulty (Board Size)**: Not yet implemented
- **Timer**: Not yet implemented
- **Start Game**: Not yet implemented

## Security Notes

- Firestore rules currently allow all reads/writes (test mode)
- Firebase config should NOT be committed to git (in `.gitignore`)
- Anonymous auth is used for simple player identification

## Future Features

- Actual game board with word grid
- Spymaster vs Operative roles
- Clue giving and guessing mechanics
- Timer implementation
- Win/loss conditions
- Difficulty settings (board sizes)