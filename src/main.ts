// Firebase services — db for Firestore, auth for anonymous authentication
import { db, auth } from './firebase';
// Firestore helpers used throughout for reading and writing lobby/game state
import { collection, addDoc, doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
// Anonymous sign-in so players don't need accounts
import { signInAnonymously } from 'firebase/auth';

// OOP model and controller layer (Jean's classes)
import { Player } from './models/Player';
import { Room } from './models/Room';
import { RoomController } from './controllers/RoomController';
import { Game } from './models/Game';
import { Turn } from './models/Turn';
import { TurnController } from './controllers/TurnController';
import { PlayerController } from './controllers/PlayerController';
import { Card } from './models/Card';

// Top-level DOM containers — app holds lobby/home UI, gameContainer holds the board
const app = document.getElementById('app')!;
const gameContainer = document.getElementById('game-container') as HTMLDivElement;

// Firestore listener cleanup — called before attaching a new onSnapshot to avoid duplicate listeners
let currentLobbyUnsubscribe: (() => void) | null = null;
// Firestore document ID of the active lobby
let currentLobbyId: string | null = null;
// OOP Room and RoomController instances (Jean's layer)
let currentRoom: Room | null = null;
let currentRoomController: RoomController | null = null;
// Game instance used for local board state and status tracking
let currentGame: Game | null = null;
// Controls turn lifecycle (clue submission, guessing phase, end turn)
let currentTurnController: TurnController | null = null;
// Ordered player list — index 0 is always the host
let currentPlayers: Player[] = [];
// Handles card guess logic and win/loss evaluation
let currentPlayerController: PlayerController | null = null;
// Index into currentPlayers pointing to whose turn it currently is
let currentPlayerIndex: number = 0;
// Guard to ensure handleStartMatch only runs once per game session
let gameInitialized: boolean = false;
// Timer duration in seconds set by host in lobby (0 = timer off)
let currentTimerDuration: number = 0;
// Reference to the active setInterval countdown so it can be cleared
let activeTimerInterval: ReturnType<typeof setInterval> | null = null;
// Tracks how many seconds remain in the current guessing countdown
let timerSecondsLeft: number = 0;
// Tracks the current turn number — increments each time a guessing phase ends
let currentTurnNumber: number = 1;
// Maximum number of turns set by the host in the lobby (0 = no limit)
let maxTurns: number = 0;
// Per-player key maps — index 0 = host, 1 = guest. Each map: { [cardId]: 'GREEN'|'NEUTRAL'|'ASSASSIN' }
let playerKeyMaps: Record<string, string>[] = [];

// ── Auth ──────────────────────────────────────────────────────────────────────
// Signs the user in anonymously if not already authenticated.
// Anonymous auth gives each player a stable uid for the session without requiring an account.
async function initAuth() {
  try {
    if (auth.currentUser) return;
    const result = await signInAnonymously(auth);
    console.log('Anonymous auth:', result.user.uid);
  } catch (error) {
    console.error('Auth error:', error);
  }
}

// ── Lobby code generator ──────────────────────────────────────────────────────
// Produces a random 6-character alphanumeric code that the host shares with their partner.
function generateLobbyCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

// ── Home page ─────────────────────────────────────────────────────────────────
// Renders the landing screen with a Create Lobby button and a Join Lobby input.
// Also clears any leftover board HTML from a previous game.
function renderHomePage() {
  app.innerHTML = `
    <h1 class="home-title">CODENAMES</h1>
    <p class="home-subtitle">Duet Edition</p>
    <button id="createLobbyBtn" class="btn btn-primary">Create Lobby</button>
    <div class="join-section">
      <h3>Join Existing Lobby</h3>
      <input type="text" id="lobbyCodeInput" class="input-code" placeholder="ENTER CODE" maxlength="6">
      <button id="joinLobbyBtn" class="btn btn-secondary">Join Lobby</button>
    </div>
  `;
  if (gameContainer) gameContainer.innerHTML = '';

  document.getElementById('createLobbyBtn')?.addEventListener('click', createLobby);
  document.getElementById('joinLobbyBtn')?.addEventListener('click', () => {
    const code = (document.getElementById('lobbyCodeInput') as HTMLInputElement).value.toUpperCase();
    if (code.length === 6) joinLobby(code);
    else alert('Please enter a valid 6-character lobby code');
  });
}

// ── Create lobby ──────────────────────────────────────────────────────────────
// Creates a new Firestore lobby document with a generated code, marks the creator
// as host, then immediately attaches a real-time listener via listenToLobby.
async function createLobby() {
  const lobbyCode = generateLobbyCode();
  let user = auth.currentUser;
  if (!user) { await initAuth(); user = auth.currentUser; }
  if (!user) { alert('Authentication failed. Please refresh.'); renderHomePage(); return; }

  try {
    const docRef = await addDoc(collection(db, 'lobbies'), {
      code: lobbyCode,
      hostId: user.uid,
      players: [{ id: user.uid, name: 'Player 1', isHost: true, role: null }],
      status: 'waiting',
      difficulty: 'normal',
      createdAt: new Date()
    });
    currentLobbyId = docRef.id;
    listenToLobby(docRef.id);
  } catch (error) {
    console.error('Error creating lobby:', error);
    alert('Failed to create lobby. Please try again.');
    renderHomePage();
  }
}

// ── Join lobby ────────────────────────────────────────────────────────────────
// Looks up the lobby by code, validates it exists and has room, appends the joining
// player to the Firestore players array, then attaches a real-time listener.
async function joinLobby(code: string) {
  const joinBtn = document.getElementById('joinLobbyBtn') as HTMLButtonElement;
  if (joinBtn) { joinBtn.textContent = 'Joining...'; joinBtn.disabled = true; }

  let user = auth.currentUser;
  if (!user) {
    await initAuth();
    user = auth.currentUser;
    if (!user) {
      alert('Authentication failed. Please try again.');
      if (joinBtn) { joinBtn.textContent = 'Join Lobby'; joinBtn.disabled = false; }
      return;
    }
  }

  try {
    // Lazy-import getDocs/query/where to keep the initial bundle lighter
    const { getDocs, query, where } = await import('firebase/firestore');
    const q = query(collection(db, 'lobbies'), where('code', '==', code));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      alert('Lobby not found. Please check the code and try again.');
      if (joinBtn) { joinBtn.textContent = 'Join Lobby'; joinBtn.disabled = false; }
      return;
    }

    const lobbyDoc = snapshot.docs[0];
    const lobbyData = lobbyDoc.data();

    // Reject if the lobby already has 2 players
    if (lobbyData.players && lobbyData.players.length >= 2) {
      alert('This lobby is full.');
      if (joinBtn) { joinBtn.textContent = 'Join Lobby'; joinBtn.disabled = false; }
      return;
    }

    // If this user is already in the lobby (e.g. page refresh), just re-attach the listener
    const alreadyInLobby = lobbyData.players?.some((p: { id: string }) => p.id === user!.uid);
    if (alreadyInLobby) {
      currentLobbyId = lobbyDoc.id;
      listenToLobby(lobbyDoc.id);
      return;
    }

    // Add the new player to the Firestore players array
    const newPlayer = { id: user.uid, name: `Player ${lobbyData.players?.length + 1 || 2}`, isHost: false, role: null };
    await updateDoc(doc(db, 'lobbies', lobbyDoc.id), {
      players: [...(lobbyData.players || []), newPlayer]
    });

    currentLobbyId = lobbyDoc.id;
    listenToLobby(lobbyDoc.id);
  } catch (error) {
    console.error('Error joining lobby:', error);
    alert('Failed to join lobby. Please try again.');
    if (joinBtn) { joinBtn.textContent = 'Join Lobby'; joinBtn.disabled = false; }
  }
}

// ── Firestore real-time listener ──────────────────────────────────────────────
// Attaches an onSnapshot listener to the lobby document.
// Routes to the appropriate UI based on game status:
//   - 'started' → initialise game once, then sync state on every subsequent update
//   - 'waiting' → show host or player lobby page depending on who's reading
function listenToLobby(lobbyId: string) {
  // Tear down any previous listener before starting a new one
  if (currentLobbyUnsubscribe) currentLobbyUnsubscribe();

  currentLobbyUnsubscribe = onSnapshot(doc(db, 'lobbies', lobbyId), (snapshot) => {
    if (!snapshot.exists()) { alert('Lobby was closed.'); renderHomePage(); return; }
    const lobbyData = snapshot.data();
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    if (lobbyData.status === 'started') {
      // First snapshot after start — set up the full game; subsequent snapshots sync state
      if (!gameInitialized) {
        gameInitialized = true;
        handleStartMatch(lobbyData.players || [], lobbyData.difficulty || 'normal', lobbyData);
      } else {
        syncGameState(lobbyData);
      }
      return;
    }

    // Game hasn't started yet — render the appropriate waiting room
    const isHost = lobbyData.hostId === currentUser.uid;
    if (isHost) renderHostLobbyPage(lobbyData.code, lobbyData);
    else renderPlayerLobbyPage(lobbyData.code, lobbyData);
  });
}

// ── Sync game state from Firestore ────────────────────────────────────────────
// Called on every Firestore snapshot after the game is running.
// Reconstructs board state from Firestore data, updates turn tracking, and
// starts/stops the guessing phase and countdown timer as needed.
function syncGameState(lobbyData: any) {
  if (!currentGame || !currentTurnController || !currentPlayers.length) return;
  const board = (currentGame as any).board;

  // Reconstruct the board from Firestore — ensures both clients see the exact same
  // card positions and revealed states regardless of local RNG
  if (lobbyData.boardCards) {
    board.loadCards(lobbyData.boardCards);
  }

  // Keep per-player key maps in sync — the guest may not have received them during
  // handleStartMatch if the host hadn't written them to Firestore yet at that point
  if (lobbyData.keyMap0 || lobbyData.keyMap1) {
    playerKeyMaps = [lobbyData.keyMap0 || {}, lobbyData.keyMap1 || {}];
  }

  // Keep local currentPlayerIndex in sync with whoever Firestore says is active
  if (lobbyData.currentTurnPlayerId) {
    const idx = currentPlayers.findIndex(p => p.getId() === lobbyData.currentTurnPlayerId);
    if (idx !== -1) currentPlayerIndex = idx;
  }

  // Sync the turn number from Firestore
  if (typeof lobbyData.turnNumber === 'number') {
    currentTurnNumber = lobbyData.turnNumber;
  }

  // Transition into guessing phase when the other client submitted a clue
  if (lobbyData.guessingEnabled && lobbyData.clue) {
    const wasGuessing = currentTurnController.isGuessingEnabled();
    if (!wasGuessing) {
      currentTurnController.submitClue(lobbyData.clue.word, lobbyData.clue.number);
      // Only the active guesser starts their own countdown to avoid duplicate Firestore writes
      const activePlayer = currentPlayers[currentPlayerIndex];
      if (activePlayer?.getId() === auth.currentUser?.uid) {
        startGuessTimer(autoEndTurn);
      }
    }
  } else if (!lobbyData.guessingEnabled && currentTurnController.isGuessingEnabled()) {
    // Guessing phase ended remotely — clean up local timer and advance the turn
    stopGuessTimer();
    currentTurnController.endTurn();
    currentTurnController.switchTurn(currentPlayers[currentPlayerIndex].getId());
  }

  // Don't overwrite a win/loss screen if the game is already over
  if (currentGame.getStatus() === 'Ended') return;

  // Check if max turns exceeded on this client (driven by Firestore turnNumber sync)
  if (maxTurns > 0 && currentTurnNumber > maxTurns) {
    currentGame.setStatus('Ended');
    currentGame.endMatch();
    gameContainer.innerHTML = `<div style="text-align:center;padding:60px;color:#f4d03f;font-size:2rem;font-weight:bold;">Game Over! Maximum turns reached.</div>`;
    return;
  }

  renderBoard();
}

// ── Host lobby page ───────────────────────────────────────────────────────────
// Renders the waiting room for the host with player list, difficulty selector,
// timer selector, name editing, and the Start Game button.
// Settings changes are persisted to Firestore so the guest sees them live.
function renderHostLobbyPage(lobbyCode: string, lobbyData: any) {
  const players = lobbyData.players || [];
  const currentUser = auth.currentUser;

  // Build each player row — inline name editor for the current user, plain text for others
  const playersHtml = players.map((p: { id: string; name: string; isHost: boolean }) => {
    const isCurrentUser = p.id === currentUser?.uid;
    const nameEditHtml = isCurrentUser
      ? `<input type="text" class="name-edit-input" id="nameInput" value="${p.name}" maxlength="15">
         <button class="edit-name-btn" id="saveNameBtn">Save</button>`
      : `<span>${p.name}</span>`;
    return `
      <div class="player-item" data-player-id="${p.id}">
        ${nameEditHtml}
        ${isCurrentUser ? '(You)' : ''}
        ${p.isHost ? '<span class="player-host">Host</span>' : ''}
      </div>`;
  }).join('');

  // Placeholder slot shown while waiting for the second player to join
  const waitingSlot = players.length < 2
    ? '<div class="player-item" style="opacity:0.5;"><span>Waiting for player...</span></div>' : '';

  app.innerHTML = `
    <h1 class="home-title">LOBBY</h1>
    <p class="home-subtitle">Share this code with your partner</p>
    <div class="lobby-code-container">
      <div class="lobby-code-display" id="lobbyCode">${lobbyCode}</div>
      <button id="copyBtn" class="copy-btn">Copy</button>
    </div>
    <div class="players-section">
      <h3>Players</h3>
      <div id="playersList">${playersHtml}${waitingSlot}</div>
    </div>
    <div class="settings-section">
      <h3>Game Settings</h3>
      <div class="setting-row">
        <span class="setting-label">Difficulty (Board Size)</span>
        <select id="difficultySelect">
          <option value="easy" ${lobbyData.difficulty === 'easy' ? 'selected' : ''}>Easy</option>
          <option value="normal" ${lobbyData.difficulty === 'normal' || !lobbyData.difficulty ? 'selected' : ''}>Normal</option>
          <option value="hard" ${lobbyData.difficulty === 'hard' ? 'selected' : ''}>Hard</option>
        </select>
      </div>
      <div class="setting-row">
        <span class="setting-label">Timer (per turn)</span>
        <select id="timerSelect">
          <option value="0" ${!lobbyData.timerDuration ? 'selected' : ''}>Off</option>
          <option value="30" ${lobbyData.timerDuration === 30 ? 'selected' : ''}>30s</option>
          <option value="60" ${lobbyData.timerDuration === 60 ? 'selected' : ''}>60s</option>
          <option value="90" ${lobbyData.timerDuration === 90 ? 'selected' : ''}>90s</option>
          <option value="120" ${lobbyData.timerDuration === 120 ? 'selected' : ''}>2 min</option>
          <option value="180" ${lobbyData.timerDuration === 180 ? 'selected' : ''}>3 min</option>
        </select>
      </div>
      <div class="setting-row">
        <span class="setting-label">Max Turns</span>
        <input type="number" id="maxTurnsInput" min="1" max="19" value="${lobbyData.maxTurns || ''}" placeholder="No limit" style="padding:6px 10px;border-radius:6px;border:2px solid #4a4a6a;background:#16213e;color:#fff;font-size:1rem;width:90px;" />
      </div>
    </div>
    <button id="startGameBtn" class="btn btn-primary" ${players.length < 2 ? 'disabled' : ''}>
      ${players.length < 2 ? 'Waiting for Player...' : 'Start Game'}
    </button>
  `;

  // Copy lobby code to clipboard with temporary confirmation text
  document.getElementById('copyBtn')?.addEventListener('click', () => {
    navigator.clipboard.writeText(lobbyCode).then(() => {
      const btn = document.getElementById('copyBtn');
      if (btn) { btn.textContent = 'Copied!'; setTimeout(() => btn.textContent = 'Copy', 2000); }
    });
  });

  // Difficulty change — written to Firestore so the guest lobby page reflects it immediately
  document.getElementById('difficultySelect')?.addEventListener('change', async (e) => {
    const val = (e.target as HTMLSelectElement).value;
    if (currentLobbyId) await updateDoc(doc(db, 'lobbies', currentLobbyId), { difficulty: val });
  });

  // Timer change — written to Firestore and read back by handleStartMatch on game start
  document.getElementById('timerSelect')?.addEventListener('change', async (e) => {
    const val = parseInt((e.target as HTMLSelectElement).value);
    if (currentLobbyId) await updateDoc(doc(db, 'lobbies', currentLobbyId), { timerDuration: val });
  });

  // Max turns change — validate 1–19 and write to Firestore; empty input clears the limit
  document.getElementById('maxTurnsInput')?.addEventListener('change', async (e) => {
    const raw = parseInt((e.target as HTMLInputElement).value);
    const val = (!isNaN(raw) && raw >= 1 && raw <= 19) ? raw : null;
    if (currentLobbyId) await updateDoc(doc(db, 'lobbies', currentLobbyId), { maxTurns: val });
  });

  // Name save — fetches the current players array, patches this user's name, and writes it back
  const saveNameBtn = document.getElementById('saveNameBtn');
  const nameInput = document.getElementById('nameInput') as HTMLInputElement;
  if (saveNameBtn && nameInput && currentLobbyId) {
    const saveName = async () => {
      const newName = nameInput.value.trim();
      if (newName && newName.length <= 15 && currentLobbyId) {
        const lobbyRef = doc(db, 'lobbies', currentLobbyId);
        const snap = await getDoc(lobbyRef);
        if (snap.exists()) {
          const data = snap.data();
          const updated = data.players.map((p: any) => p.id === currentUser?.uid ? { ...p, name: newName } : p);
          await updateDoc(lobbyRef, { players: updated });
        }
      }
    };
    saveNameBtn.addEventListener('click', saveName);
    nameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') saveName(); });
  }

  // Start Game — sets status to 'started' in Firestore, triggering handleStartMatch on both clients
  document.getElementById('startGameBtn')?.addEventListener('click', async () => {
    if (players.length >= 2 && currentLobbyId) {
      await updateDoc(doc(db, 'lobbies', currentLobbyId), { status: 'started' });
    }
  });
}

// ── Player lobby page ─────────────────────────────────────────────────────────
// Renders the waiting room for the non-host player.
// Settings are read-only; only name editing is allowed.
function renderPlayerLobbyPage(lobbyCode: string, lobbyData: any) {
  const players = lobbyData.players || [];
  const currentUser = auth.currentUser;

  const playersHtml = players.map((p: { id: string; name: string; isHost: boolean }) => {
    const isCurrentUser = p.id === currentUser?.uid;
    const nameEditHtml = isCurrentUser
      ? `<input type="text" class="name-edit-input" id="nameInput" value="${p.name}" maxlength="15">
         <button class="edit-name-btn" id="saveNameBtn">Save</button>`
      : `<span>${p.name}</span>`;
    return `
      <div class="player-item" data-player-id="${p.id}">
        ${nameEditHtml}
        ${isCurrentUser ? '(You)' : ''}
        ${p.isHost ? '<span class="player-host">Host</span>' : ''}
      </div>`;
  }).join('');

  app.innerHTML = `
    <h1 class="home-title">LOBBY</h1>
    <p class="home-subtitle">Joined Lobby</p>
    <div class="lobby-code-container">
      <div class="lobby-code-display">${lobbyCode}</div>
    </div>
    <div class="players-section">
      <h3>Players</h3>
      <div id="playersList">${playersHtml}</div>
    </div>
    <div class="settings-section">
      <h3>Game Settings</h3>
      <div class="setting-row">
        <span class="setting-label">Difficulty</span>
        <span>${lobbyData.difficulty || 'normal'}</span>
      </div>
      <div class="setting-row">
        <span class="setting-label">Timer (per turn)</span>
        <span>${lobbyData.timerDuration ? lobbyData.timerDuration + 's' : 'Off'}</span>
      </div>
      <div class="setting-row">
        <span class="setting-label">Max Turns</span>
        <span>${lobbyData.maxTurns ? lobbyData.maxTurns : 'No limit'}</span>
      </div>
    </div>
  `;

  // Name save — same patch logic as host lobby
  const saveNameBtn = document.getElementById('saveNameBtn');
  const nameInput = document.getElementById('nameInput') as HTMLInputElement;
  if (saveNameBtn && nameInput && currentLobbyId) {
    const saveName = async () => {
      const newName = nameInput.value.trim();
      if (newName && newName.length <= 15 && currentLobbyId) {
        const lobbyRef = doc(db, 'lobbies', currentLobbyId);
        const snap = await getDoc(lobbyRef);
        if (snap.exists()) {
          const data = snap.data();
          const updated = data.players.map((p: any) => p.id === currentUser?.uid ? { ...p, name: newName } : p);
          await updateDoc(lobbyRef, { players: updated });
        }
      }
    };
    saveNameBtn.addEventListener('click', saveName);
    nameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') saveName(); });
  }
}

// ── Key map generator ─────────────────────────────────────────────────────────
// Produces an independent type assignment for a given set of card IDs.
// Called twice on the host to give each player their own private GREEN layout.
function generateKeyMap(cardIds: string[], diff: string): Record<string, string> {
  let green: number, assassin: number;
  if (diff === 'easy') { green = 3; assassin = 1; }
  else if (diff === 'hard') { green = 11; assassin = 3; }
  else { green = 9; assassin = 3; }
  const neutral = cardIds.length - green - assassin;
  const types = [...Array(green).fill('GREEN'), ...Array(assassin).fill('ASSASSIN'), ...Array(neutral).fill('NEUTRAL')];
  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]];
  }
  const map: Record<string, string> = {};
  cardIds.forEach((id, i) => { map[id] = types[i]; });
  return map;
}

// ── Start match ───────────────────────────────────────────────────────────────
// Initialises the full OOP game layer and board state when the game begins.
// The host generates the board and writes it to Firestore; the guest reads it back
// via loadCards() so both players see the exact same card layout.
async function handleStartMatch(firestorePlayers: any[], difficulty: string, lobbyData?: any) {
  // Store the timer duration set in the lobby (0 means no timer)
  currentTimerDuration = lobbyData?.timerDuration || 0;
  // Store the max turns set by the host in the lobby (0 = no limit)
  maxTurns = lobbyData?.maxTurns || 0;
  currentTurnNumber = 1;
  // Clear any stale timer from a previous game
  if (activeTimerInterval) { clearInterval(activeTimerInterval); activeTimerInterval = null; }

  // Map Firestore player objects → Jean's Player class instances
  currentPlayers = firestorePlayers.map(
    (p, i) => new Player(p.id, p.name, i === 0)
  );

  // Build Room + RoomController (Jean's OOP layer)
  const [host] = currentPlayers;
  currentRoom = new Room('active', host);
  currentRoomController = new RoomController(currentRoom);
  currentRoomController.setDifficulty(difficulty);

  // Register guest players with the room
  const guests = currentPlayers.slice(1);
  guests.forEach(guest => currentRoomController!.joinRoom(guest, 'active'));

  // startMatch() triggers room.createGame() internally
  currentRoomController.startMatch(host);

  // Build the local Game instance used for board rendering and status tracking
  currentGame = new Game(currentPlayers, difficulty);

  // initializeGameData() must run first to set up board and internal data structures
  currentGame.initializeGameData();

  if (lobbyData?.boardCards) {
    // Guest path: board already exists in Firestore — load it without types (playerKeyMaps supplies them)
    const board = (currentGame as any).board;
    board.loadCards(lobbyData.boardCards);
    // Load both per-player key maps from Firestore
    playerKeyMaps = [lobbyData.keyMap0 || {}, lobbyData.keyMap1 || {}];
    if (lobbyData.currentTurnPlayerId) {
      const idx = currentPlayers.findIndex(p => p.getId() === lobbyData.currentTurnPlayerId);
      if (idx !== -1) currentPlayerIndex = idx;
    }
    if (typeof lobbyData.turnNumber === 'number') currentTurnNumber = lobbyData.turnNumber;
  } else if (currentLobbyId && auth.currentUser?.uid === host.getId()) {
    // Host path: generate two independent key maps (one per player) and write everything to Firestore
    const board = (currentGame as any).board;
    const cards = (board as any).cards as Card[];
    const cardIds = cards.map((c: Card) => c.getId());
    const keyMap0 = generateKeyMap(cardIds, difficulty);
    const keyMap1 = generateKeyMap(cardIds, difficulty);
    playerKeyMaps = [keyMap0, keyMap1];
    await updateDoc(doc(db, 'lobbies', currentLobbyId), {
      boardCards: cards.map((c: Card) => ({ id: c.getId(), word: c.getWord(), type: 'NEUTRAL', revealed: false })),
      keyMap0,
      keyMap1,
      currentTurnPlayerId: host.getId(),
      clue: null,
      guessingEnabled: false,
      turnNumber: 1
    });
  }

  // Advance game to active state and kick off the first round
  currentGame.setStatus('Created');
  currentGame.startFirstRound();

  // Create the Turn / TurnController for the host as first clue giver
  const turn = new Turn(host.getId());
  currentTurnController = new TurnController(turn, currentGame);
  currentTurnController.startTurn(host.getId());
  // PlayerController handles makeGuess() calls and win/loss evaluation
  currentPlayerController = new PlayerController((currentGame as any).board, currentGame);

  // If the game snapshot already has an active clue, enter guessing phase immediately
  if (lobbyData?.guessingEnabled && lobbyData?.clue) {
    currentTurnController.submitClue(lobbyData.clue.word, lobbyData.clue.number);
  }

  renderBoard();
}

// ── Timer helpers ─────────────────────────────────────────────────────────────
// stopGuessTimer clears the active countdown interval so the timer stops ticking.
function stopGuessTimer() {
  if (activeTimerInterval) { clearInterval(activeTimerInterval); activeTimerInterval = null; }
}

// startGuessTimer begins a 1-second countdown from currentTimerDuration.
// Updates the #timerDisplay element each tick and calls onExpire when it reaches 0.
// No-ops if the host set the timer to 0 (off).
function startGuessTimer(onExpire: () => void) {
  stopGuessTimer();
  if (!currentTimerDuration) return;
  timerSecondsLeft = currentTimerDuration;
  activeTimerInterval = setInterval(() => {
    timerSecondsLeft--;
    const el = document.getElementById('timerDisplay');
    if (el) {
      el.textContent = `⏱ ${timerSecondsLeft}s`;
      // Turn the timer red in the last 10 seconds as a warning
      el.style.color = timerSecondsLeft <= 10 ? '#e74c3c' : '#f4d03f';
    }
    if (timerSecondsLeft <= 0) {
      stopGuessTimer();
      onExpire();
    }
  }, 1000);
}

// ── Auto end turn ─────────────────────────────────────────────────────────────
// Called when the guess timer expires. Only fires a Firestore write if this client
// is the active guesser, preventing duplicate writes from both clients.
function autoEndTurn() {
  if (!currentTurnController || !currentPlayers.length) return;
  const activePlayer = currentPlayers[currentPlayerIndex];
  // Guard: only the guesser whose timer ran out should write to Firestore
  if (activePlayer?.getId() !== auth.currentUser?.uid) return;
  currentTurnController.endTurn();
  currentTurnNumber++;
  const currentPlayer = currentPlayers[currentPlayerIndex];
  currentTurnController.switchTurn(currentPlayer.getId());
  // Write the turn switch to Firestore so the other player's client picks it up
  if (currentLobbyId) updateDoc(doc(db, 'lobbies', currentLobbyId), { currentTurnPlayerId: currentPlayer.getId(), clue: null, guessingEnabled: false, turnNumber: currentTurnNumber });
  if (maxTurns > 0 && currentTurnNumber > maxTurns) {
    currentGame!.setStatus('Ended');
    currentGame!.endMatch();
    gameContainer.innerHTML = `<div style="text-align:center;padding:60px;color:#f4d03f;font-size:2rem;font-weight:bold;">Game Over! Maximum turns reached.</div>`;
    return;
  }
  renderBoard();
}

// ── Board render ──────────────────────────────────────────────────────────────
// Rebuilds the entire game UI from scratch on every state change.
// Renders: turn banner, clue form (clue phase) or clue display + timer + End Turn (guessing phase),
// then the card grid. Card clicks trigger makeGuess(), sync the board to Firestore,
// and check for win/loss conditions.
function renderBoard() {
  if (!currentGame || !currentTurnController) return;
  const board = (currentGame as any).board;
  const cards = (board as any).cards as Card[];
  const guessingEnabled = currentTurnController.isGuessingEnabled();

  if (gameContainer) {
    gameContainer.innerHTML = '';

    const activePlayer = currentPlayers[currentPlayerIndex];
    const isMyTurn = activePlayer?.getId() === auth.currentUser?.uid;

    // Turn banner — green for your turn, dark for the opponent's turn
    const turnBanner = document.createElement('div');
    turnBanner.style.cssText = `text-align:center;padding:10px;color:#fff;font-size:1.1rem;font-weight:bold;background:${isMyTurn ? '#27ae60' : '#4a4a6a'};border-radius:8px;margin:10px 20px;`;
    const turnLabel = maxTurns > 0 ? `Turn ${currentTurnNumber} / ${maxTurns}` : `Turn ${currentTurnNumber}`;
    turnBanner.textContent = `${turnLabel} — ${activePlayer?.getId() ?? 'Unknown'}${isMyTurn ? ' (You)' : ''}`;
    gameContainer.appendChild(turnBanner);

    if (!guessingEnabled) {
      if (isMyTurn) {
        const refSection = document.createElement('div');
        refSection.style.cssText = `padding:14px 20px;`;
        const refTitle = document.createElement('div');
        refTitle.style.cssText = `text-align:center;color:#a0c4ff;font-size:0.9rem;font-weight:bold;margin-bottom:8px;letter-spacing:0.05em;`;
        refTitle.textContent = '🗝 YOUR KEY — give clues for the green cards';
        refSection.appendChild(refTitle);

        const cols = (board as any).gridSize === 5 ? 5 : 3;
        const refGrid = document.createElement('div');
        refGrid.style.cssText = `display:grid;grid-template-columns:repeat(${cols},1fr);gap:6px;width:${cols === 5 ? '900px' : '540px'};margin:0 auto;`;
        cards.forEach((card: Card) => {
          const type = playerKeyMaps[currentPlayerIndex]?.[card.getId()] ?? 'NEUTRAL';
          let bg = '#2c2c4e';
          let color = '#ccc';
          let border = '2px solid #4a4a6a';
          if (type === 'GREEN') { bg = card.isRevealed() ? '#1a6b3c' : '#27ae60'; color = '#fff'; border = '2px solid #1e8449'; }
          else if (type === 'ASSASSIN') { bg = card.isRevealed() ? '#6b1a1a' : '#c0392b'; color = '#fff'; border = '2px solid #a93226'; }
          const tile = document.createElement('div');
          tile.style.cssText = `padding:8px 4px;border-radius:6px;border:${border};background:${bg};color:${color};font-size:0.72rem;font-weight:bold;text-align:center;opacity:${card.isRevealed() ? '0.45' : '1'};`;
          tile.textContent = card.isRevealed() ? '✓' : card.getWord();
          refGrid.appendChild(tile);
        });
        refSection.appendChild(refGrid);
        gameContainer.appendChild(refSection);
      }

      // Clue phase — show the clue input form; disabled for the non-active player
      const clueForm = document.createElement('div');
      clueForm.style.cssText = `display:flex;flex-direction:column;align-items:center;gap:12px;padding:20px;`;
      clueForm.innerHTML = `
        <h3 style="color:#fff;margin:0;">Give a Clue</h3>
        <div style="display:flex;gap:10px;">
          <input id="clueWord" type="text" placeholder="Clue word" ${!isMyTurn ? 'disabled' : ''} style="padding:10px;border-radius:8px;border:2px solid #4a4a6a;background:#16213e;color:#fff;font-size:1rem;" />
          <input id="clueNumber" type="number" min="1" max="9" placeholder="Number" ${!isMyTurn ? 'disabled' : ''} style="padding:10px;border-radius:8px;border:2px solid #4a4a6a;background:#16213e;color:#fff;font-size:1rem;width:80px;" />
          <button id="submitClueBtn" ${!isMyTurn ? 'disabled' : ''} style="padding:10px 20px;border-radius:8px;background:#4a4a6a;color:#fff;font-weight:bold;border:none;cursor:${isMyTurn ? 'pointer' : 'not-allowed'};">Submit</button>
        </div>
      `;
      gameContainer.appendChild(clueForm);

      if (isMyTurn) {
        document.getElementById('submitClueBtn')!.addEventListener('click', () => {
          const word = (document.getElementById('clueWord') as HTMLInputElement).value.trim();
          const number = parseInt((document.getElementById('clueNumber') as HTMLInputElement).value);
          if (!word || isNaN(number)) return;
          // Record the clue locally via the Player model then submit to TurnController
          const clue = currentPlayers[currentPlayerIndex].createClue(word, number);
          currentTurnController!.submitClue(clue.word, clue.number);
          // Switch to the other player as guesser
          currentPlayerIndex = currentPlayerIndex === 0 ? 1 : 0;
          const guesser = currentPlayers[currentPlayerIndex];
          currentTurnController!.switchTurn(guesser.getId());
          // Broadcast clue and turn switch to Firestore so the other client enters guessing phase
          if (currentLobbyId) updateDoc(doc(db, 'lobbies', currentLobbyId), { clue: { word: clue.word, number: clue.number }, guessingEnabled: true, currentTurnPlayerId: guesser.getId() });
          renderBoard();
          startGuessTimer(autoEndTurn);
        });
      }
    } else {
      // Guessing phase — display the active clue word and number
      const clue = currentTurnController.getClue();
      const clueDisplay = document.createElement('div');
      clueDisplay.style.cssText = `text-align:center;padding:10px;color:#f4d03f;font-size:1.2rem;font-weight:bold;`;
      clueDisplay.textContent = `Clue: "${clue.word}" — ${clue.number}`;
      gameContainer.appendChild(clueDisplay);

      // Show countdown timer if host configured one
      if (currentTimerDuration > 0) {
        const timerEl = document.createElement('div');
        timerEl.id = 'timerDisplay';
        timerEl.style.cssText = `text-align:center;font-size:1.4rem;font-weight:bold;color:#f4d03f;padding:4px;`;
        timerEl.textContent = `⏱ ${timerSecondsLeft > 0 ? timerSecondsLeft : currentTimerDuration}s`;
        gameContainer.appendChild(timerEl);
      }

      // End Turn button — only rendered for the active guesser
      if (isMyTurn) {
        const endTurnBtn = document.createElement('button');
        endTurnBtn.textContent = 'End Turn';
        endTurnBtn.style.cssText = `display:block;margin:0 auto;padding:10px 24px;border-radius:8px;background:#e74c3c;color:#fff;font-weight:bold;border:none;cursor:pointer;`;
        endTurnBtn.addEventListener('click', () => {
          stopGuessTimer();
          currentTurnController!.endTurn();
          currentTurnNumber++;
          // Keep the current player as the next clue giver (they just finished guessing)
          const currentPlayer = currentPlayers[currentPlayerIndex];
          currentTurnController!.switchTurn(currentPlayer.getId());
          // Broadcast the turn end to Firestore
          if (currentLobbyId) updateDoc(doc(db, 'lobbies', currentLobbyId), { currentTurnPlayerId: currentPlayer.getId(), clue: null, guessingEnabled: false, turnNumber: currentTurnNumber });
          if (maxTurns > 0 && currentTurnNumber > maxTurns) {
            currentGame!.setStatus('Ended');
            currentGame!.endMatch();
            gameContainer.innerHTML = `<div style="text-align:center;padding:60px;color:#f4d03f;font-size:2rem;font-weight:bold;">Game Over! Maximum turns reached.</div>`;
            return;
          }
          renderBoard();
        });
        gameContainer.appendChild(endTurnBtn);
      }
    }

    // Card grid — columns determined by board difficulty (5 for normal/hard, 3 for easy)
    const boardGrid = document.createElement('div');
    const cols = (board as any).gridSize === 5 ? 5 : 3;
    boardGrid.style.cssText = `display:grid;grid-template-columns:repeat(${cols},1fr);gap:12px;padding:20px;width:${cols === 5 ? '1000px' : '800px'};box-sizing:border-box;`;
    // Cards are only clickable during the guessing phase on the active player's turn
    const canGuess = guessingEnabled && isMyTurn;
    // During guessing phase, the clue-giver is the other player; use their key map for card colours and win/loss
    const clueGiverIdx = guessingEnabled ? (currentPlayerIndex === 0 ? 1 : 0) : currentPlayerIndex;
    const activeKeyMap = playerKeyMaps[clueGiverIdx] ?? {};
    cards.forEach((card: Card) => {
      const el = document.createElement('button');
      el.textContent = card.getWord();
      const type = activeKeyMap[card.getId()] ?? 'NEUTRAL';
      // Revealed colour: green for team cards, red for assassin, grey for neutral
      const revealedBg = type === 'GREEN' ? '#27ae60' : type === 'ASSASSIN' ? '#e74c3c' : '#bdc3c7';
      const revealedColor = type === 'NEUTRAL' ? '#111' : '#fff';
      el.disabled = !canGuess;
      el.style.cssText = `padding:24px 12px;border-radius:10px;border:2px solid #4a4a6a;
        background:${card.isRevealed() ? revealedBg : '#16213e'};
        color:${card.isRevealed() ? revealedColor : '#fff'};font-weight:bold;cursor:${canGuess ? 'pointer' : 'not-allowed'};min-height:100px;opacity:${canGuess ? '1' : '0.6'};`;
      el.addEventListener('click', () => {
        // Reveal the card locally
        card.reveal();
        // Sync the updated revealed states to Firestore so both clients see the flip
        if (currentLobbyId) {
          const allCards = (board as any).cards as Card[];
          updateDoc(doc(db, 'lobbies', currentLobbyId), {
            boardCards: allCards.map(c => ({ id: c.getId(), word: c.getWord(), type: 'NEUTRAL', revealed: c.isRevealed() }))
          });
        }
        // Evaluate win/loss against the clue-giver's key map
        const cardType = activeKeyMap[card.getId()] ?? 'NEUTRAL';
        if (cardType === 'ASSASSIN') {
          currentGame!.setStatus('Lost');
          currentGame!.endMatch();
          gameContainer.innerHTML = `<div style="text-align:center;padding:60px;color:#e74c3c;font-size:2rem;font-weight:bold;">Game Over! The assassin was revealed.</div>`;
        } else {
          const greenCards = cards.filter(c => (activeKeyMap[c.getId()] ?? 'NEUTRAL') === 'GREEN');
          const allGreenRevealed = greenCards.length > 0 && greenCards.every(c => c.isRevealed());
          if (allGreenRevealed) {
            currentGame!.setStatus('Won');
            currentGame!.endMatch();
            gameContainer.innerHTML = `<div style="text-align:center;padding:60px;color:#2ecc71;font-size:2rem;font-weight:bold;">You Win! All green cards revealed.</div>`;
          } else {
            renderBoard();
          }
        }
      });
      boardGrid.appendChild(el);
    });
    gameContainer.appendChild(boardGrid);
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────
// Entry point — sign the user in anonymously then render the home screen.
function init() { initAuth(); renderHomePage(); }
init();
