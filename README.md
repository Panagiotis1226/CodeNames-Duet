# Codenames Duet

A web-based two-player implementation of the Codenames Duet board game built with TypeScript and Firebase.

## Tech Stack

- **Frontend**: TypeScript, HTML5, CSS3
- **Build Tool**: Vite
- **Backend**: Firebase (Firestore, Anonymous Authentication)

## Project Structure

```
├── index.html                  # Main HTML and CSS styles
├── src/
│   ├── main.ts                 # Application entry point — auth, lobby UI, game rendering, Firestore sync
│   ├── firebase.ts             # Firebase configuration (not committed to git)
│   ├── models/
│   │   ├── Game.ts             # Central game state — board, players, turn counter, status, timer, key map
│   │   ├── Board.ts            # Card generation, grid sizing, board reconstruction from Firestore
│   │   ├── Card.ts             # Single card — word, type (GREEN/NEUTRAL/ASSASSIN), revealed state
│   │   ├── CardType.ts         # Enum defining the three card types
│   │   ├── Player.ts           # Player identity, name, host flag, clue storage
│   │   ├── Room.ts             # Lobby state — players, host, difficulty, match-started flag
│   │   ├── Turn.ts             # Turn state — active player, clue, guessing phase flag
│   │   ├── Timer.ts            # Timer metadata model — countdown driven externally via setInterval
│   │   └── KeyMap.ts           # O(1) card-id → card-type lookup map built at game init
│   └── controllers/
│       ├── RoomController.ts   # Room lifecycle — create, join, set difficulty, start match
│       ├── TurnController.ts   # Turn lifecycle — start, submit clue, enable guessing, end, switch
│       └── PlayerController.ts # Guess action — reveal card, mark as identified, evaluate win/loss
├── package.json
└── tsconfig.json
```

## Features

### Lobby System
- Landing page with **Create Lobby** and **Join Lobby** options
- 6-character alphanumeric lobby codes shared between players
- Real-time lobby updates via Firestore `onSnapshot` — both players see name changes and join events instantly
- Host can edit difficulty, timer, and max turns settings; guest sees them live (read-only)
- Each player can edit their own display name (up to 15 characters)
- Start Game button enabled only when both players are present

### Game Board
- Three difficulty levels:
  - **Easy** — 3×3 grid, 9 cards (3 green, 1 assassin)
  - **Normal** — 5×5 grid, 25 cards (9 green, 3 assassin)
  - **Hard** — 5×5 grid, 25 cards (11 green, 3 assassin)
- Host generates the board and writes it to Firestore; guest reconstructs it deterministically — no RNG divergence between clients

### Turn Structure
- Players alternate turns: the active player submits a clue (word + number), the other player guesses
- Clue submission is written to Firestore and triggers the guessing phase on both clients
- Guessing phase can be ended manually or automatically when the turn timer expires
- Turn state (active player, clue, guessing phase) is fully synchronised via Firestore
- Optional **max turns** limit (1–19): game ends with a "Maximum turns reached" screen when the limit is hit

### Win / Loss Conditions
- **Win** — all GREEN cards revealed
- **Loss** — any ASSASSIN card revealed

### Timer
- Optional per-turn countdown: Off, 30s, 60s, 90s, 2 min, 3 min
- Set by the host in the lobby; applies to the guessing phase of each turn
- Only the active guesser drives the countdown to avoid duplicate Firestore writes

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Firebase Configuration
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a project and register a web app
3. Enable **Authentication → Anonymous** sign-in
4. Enable **Firestore Database** (test mode is fine for development)
5. Copy your Firebase config into `src/firebase.ts`

### 3. Run Development Server
```bash
npm run dev
```

### 4. Build for Production
```bash
npm run build
```

## Available Scripts

- `npm run dev` — start development server
- `npm run build` — type-check and build for production
- `npm run preview` — preview production build locally

## Testing Multiplayer Locally

Firebase Anonymous Auth persists per browser session, so use one of:
- Host in a normal window, guest in an Incognito / Private window
- Two different browsers (e.g. Chrome + Firefox)
- Two different devices on the same network

## Security Notes

- Firebase config is excluded from git via `.gitignore`
- Anonymous auth is used — no account required
- Firestore rules are currently open (test mode); restrict them before any public deployment

## AI Usage

AI assistance was used for:
- Writing more structured and consistent code comments
- Troubleshooting bugs and unexpected behaviour
- Learning how to implement certain parts of the codebase (e.g. Firestore real-time sync, Firebase Auth)
- Brainstorming and refining the visual theme and look of the game
