import { db, auth } from './firebase';
import { collection, addDoc, doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';

import { Player } from './models/Player';
import { Room } from './models/Room';
import { RoomController } from './controllers/RoomController';
import { Game } from './models/Game';
import { Turn } from './models/Turn';
import { TurnController } from './controllers/TurnController';
import { PlayerController } from './controllers/PlayerController';
import { Card } from './models/Card';

const app = document.getElementById('app')!;
const gameContainer = document.getElementById('game-container') as HTMLDivElement;

let currentLobbyUnsubscribe: (() => void) | null = null;
let currentLobbyId: string | null = null;
let currentRoom: Room | null = null;
let currentRoomController: RoomController | null = null;
let currentGame: Game | null = null;
let currentTurnController: TurnController | null = null;
let currentPlayers: Player[] = [];
let currentPlayerController: PlayerController | null = null;
let currentPlayerIndex: number = 0;
let gameInitialized: boolean = false;

// ── Auth ──────────────────────────────────────────────────────────────────────

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

function generateLobbyCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

// ── Home page ─────────────────────────────────────────────────────────────────

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

// ── Create lobby (from main — untouched) ─────────────────────────────────────

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

// ── Join lobby (from main — untouched) ────────────────────────────────────────

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

    if (lobbyData.players && lobbyData.players.length >= 2) {
      alert('This lobby is full.');
      if (joinBtn) { joinBtn.textContent = 'Join Lobby'; joinBtn.disabled = false; }
      return;
    }

    const alreadyInLobby = lobbyData.players?.some((p: { id: string }) => p.id === user!.uid);
    if (alreadyInLobby) {
      currentLobbyId = lobbyDoc.id;
      listenToLobby(lobbyDoc.id);
      return;
    }

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

// ── Firestore listener (from main — untouched) ────────────────────────────────

function listenToLobby(lobbyId: string) {
  if (currentLobbyUnsubscribe) currentLobbyUnsubscribe();

  currentLobbyUnsubscribe = onSnapshot(doc(db, 'lobbies', lobbyId), (snapshot) => {
    if (!snapshot.exists()) { alert('Lobby was closed.'); renderHomePage(); return; }
    const lobbyData = snapshot.data();
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    if (lobbyData.status === 'started') {
      if (!gameInitialized) {
        gameInitialized = true;
        handleStartMatch(lobbyData.players || [], lobbyData.difficulty || 'normal', lobbyData);
      } else {
        syncGameState(lobbyData);
      }
      return;
    }

    const isHost = lobbyData.hostId === currentUser.uid;
    if (isHost) renderHostLobbyPage(lobbyData.code, lobbyData);
    else renderPlayerLobbyPage(lobbyData.code, lobbyData);
  });
}

function syncGameState(lobbyData: any) {
  if (!currentGame || !currentTurnController || !currentPlayers.length) return;
  const board = (currentGame as any).board;

  if (lobbyData.boardCards) {
    const boardCards: { id: string; revealed: boolean }[] = lobbyData.boardCards;
    boardCards.forEach(fc => { if (fc.revealed) board.revealCard(fc.id); });
  }

  if (lobbyData.currentTurnPlayerId) {
    const idx = currentPlayers.findIndex(p => p.getId() === lobbyData.currentTurnPlayerId);
    if (idx !== -1 && idx !== currentPlayerIndex) {
      currentPlayerIndex = idx;
      currentTurnController.switchTurn(lobbyData.currentTurnPlayerId);
    }
  }

  if (lobbyData.guessingEnabled && !currentTurnController.isGuessingEnabled() && lobbyData.clue) {
    currentTurnController.submitClue(lobbyData.clue.word, lobbyData.clue.number);
  } else if (!lobbyData.guessingEnabled && currentTurnController.isGuessingEnabled()) {
    currentTurnController.endTurn();
    currentTurnController.switchTurn(currentPlayers[currentPlayerIndex].getId());
  }

  renderBoard();
}

// ── Host lobby page (from main — untouched, + difficulty wired) ───────────────

function renderHostLobbyPage(lobbyCode: string, lobbyData: any) {
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
        <span class="setting-label">Timer</span>
        <span class="setting-placeholder">[Placeholder]</span>
      </div>
    </div>
    <button id="startGameBtn" class="btn btn-primary" ${players.length < 2 ? 'disabled' : ''}>
      ${players.length < 2 ? 'Waiting for Player...' : 'Start Game'}
    </button>
  `;

  document.getElementById('copyBtn')?.addEventListener('click', () => {
    navigator.clipboard.writeText(lobbyCode).then(() => {
      const btn = document.getElementById('copyBtn');
      if (btn) { btn.textContent = 'Copied!'; setTimeout(() => btn.textContent = 'Copy', 2000); }
    });
  });

  // Difficulty — persisted to Firestore so both players see it
  document.getElementById('difficultySelect')?.addEventListener('change', async (e) => {
    const val = (e.target as HTMLSelectElement).value;
    if (currentLobbyId) await updateDoc(doc(db, 'lobbies', currentLobbyId), { difficulty: val });
  });

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

  document.getElementById('startGameBtn')?.addEventListener('click', async () => {
    if (players.length >= 2 && currentLobbyId) {
      await updateDoc(doc(db, 'lobbies', currentLobbyId), { status: 'started' });
    }
  });
}

// ── Player lobby page (from main — untouched) ─────────────────────────────────

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
    </div>
  `;

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

// ── Start match — Jean's OOP wired in here ────────────────────────────────────

async function handleStartMatch(firestorePlayers: any[], difficulty: string, lobbyData?: any) {
  // Map Firestore player objects → Jean's Player class instances
  currentPlayers = firestorePlayers.map(
    (p, i) => new Player(p.id, p.name, i === 0)
  );

  // Build Room + RoomController (Jean's OOP)
  const [host] = currentPlayers;
  currentRoom = new Room('active', host);
  currentRoomController = new RoomController(currentRoom);
  currentRoomController.setDifficulty(difficulty);

  // OOP layer: guest players join the room
  const guests = currentPlayers.slice(1);
  guests.forEach(guest => currentRoomController!.joinRoom(guest, 'active'));

  // startMatch() calls room.createGame() internally
  currentRoomController.startMatch(host);

  // Build Game directly for local rendering
  currentGame = new Game(currentPlayers, difficulty);

  // If Firestore already has board state, restore it; otherwise generate fresh (host only)
  if (lobbyData?.boardCards) {
    currentGame.initializeGameData();
    const board = (currentGame as any).board;
    lobbyData.boardCards.forEach((fc: any) => {
      if (fc.revealed) board.revealCard(fc.id);
    });
    if (lobbyData.currentTurnPlayerId) {
      const idx = currentPlayers.findIndex(p => p.getId() === lobbyData.currentTurnPlayerId);
      if (idx !== -1) currentPlayerIndex = idx;
    }
  } else {
    currentGame.initializeGameData();
    // Only host writes the initial board to Firestore
    if (currentLobbyId && auth.currentUser?.uid === host.getId()) {
      const board = (currentGame as any).board;
      const cards = (board as any).cards as Card[];
      await updateDoc(doc(db, 'lobbies', currentLobbyId), {
        boardCards: cards.map(c => ({ id: c.getId(), word: c.getWord(), type: c.getCardType(), revealed: false })),
        currentTurnPlayerId: host.getId(),
        clue: null,
        guessingEnabled: false
      });
    }
  }

  currentGame.setStatus('Created');
  currentGame.startFirstRound();

  // Start first turn with host as active player
  const turn = new Turn(host.getId());
  currentTurnController = new TurnController(turn, currentGame);
  currentTurnController.startTurn(host.getId());
  currentPlayerController = new PlayerController((currentGame as any).board, currentGame);

  if (lobbyData?.guessingEnabled && lobbyData?.clue) {
    currentTurnController.submitClue(lobbyData.clue.word, lobbyData.clue.number);
  }

  renderBoard();
}

// ── Board render (from Jean) ──────────────────────────────────────────────────

function renderBoard() {
  if (!currentGame || !currentTurnController) return;
  const board = (currentGame as any).board;
  const cards = (board as any).cards as Card[];
  const guessingEnabled = currentTurnController.isGuessingEnabled();

  if (gameContainer) {
    gameContainer.innerHTML = '';

    const activePlayer = currentPlayers[currentPlayerIndex];
    const isMyTurn = activePlayer?.getId() === auth.currentUser?.uid;

    const turnBanner = document.createElement('div');
    turnBanner.style.cssText = `text-align:center;padding:10px;color:#fff;font-size:1.1rem;font-weight:bold;background:${isMyTurn ? '#27ae60' : '#4a4a6a'};border-radius:8px;margin:10px 20px;`;
    turnBanner.textContent = `${activePlayer?.getId() ?? 'Unknown'}'s Turn${isMyTurn ? ' (You)' : ''}`;
    gameContainer.appendChild(turnBanner);

    if (!guessingEnabled) {
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
          const clue = currentPlayers[currentPlayerIndex].createClue(word, number);
          currentTurnController!.submitClue(clue.word, clue.number);
          if (currentLobbyId) updateDoc(doc(db, 'lobbies', currentLobbyId), { clue: { word: clue.word, number: clue.number }, guessingEnabled: true });
          renderBoard();
        });
      }
    } else {
      const clue = currentTurnController.getClue();
      const clueDisplay = document.createElement('div');
      clueDisplay.style.cssText = `text-align:center;padding:10px;color:#f4d03f;font-size:1.2rem;font-weight:bold;`;
      clueDisplay.textContent = `Clue: "${clue.word}" — ${clue.number}`;
      gameContainer.appendChild(clueDisplay);

      if (isMyTurn) {
        const endTurnBtn = document.createElement('button');
        endTurnBtn.textContent = 'End Turn';
        endTurnBtn.style.cssText = `display:block;margin:0 auto;padding:10px 24px;border-radius:8px;background:#e74c3c;color:#fff;font-weight:bold;border:none;cursor:pointer;`;
        endTurnBtn.addEventListener('click', () => {
          currentTurnController!.endTurn();
          currentPlayerIndex = currentPlayerIndex === 0 ? 1 : 0;
          const nextPlayer = currentPlayers[currentPlayerIndex];
          currentTurnController!.switchTurn(nextPlayer.getId());
          if (currentLobbyId) updateDoc(doc(db, 'lobbies', currentLobbyId), { currentTurnPlayerId: nextPlayer.getId(), clue: null, guessingEnabled: false });
          renderBoard();
        });
        gameContainer.appendChild(endTurnBtn);
      }
    }

    const boardGrid = document.createElement('div');
    const cols = (board as any).gridSize === 5 ? 5 : 3;
    boardGrid.style.cssText = `display:grid;grid-template-columns:repeat(${cols},1fr);gap:12px;padding:20px;width:${cols === 5 ? '1000px' : '800px'};box-sizing:border-box;`;
    const canGuess = guessingEnabled && isMyTurn;
    cards.forEach((card: Card) => {
      const el = document.createElement('button');
      el.textContent = card.getWord();
      el.disabled = !canGuess;
      el.style.cssText = `padding:24px 12px;border-radius:10px;border:2px solid #4a4a6a;
        background:${card.isRevealed() ? '#f4d03f' : '#16213e'};
        color:${card.isRevealed() ? '#111' : '#fff'};font-weight:bold;cursor:${canGuess ? 'pointer' : 'not-allowed'};min-height:100px;opacity:${canGuess ? '1' : '0.6'};`;
      el.addEventListener('click', () => {
        const result = currentPlayerController!.makeGuess(card.getId());
        if (currentLobbyId) {
          const allCards = (board as any).cards as Card[];
          updateDoc(doc(db, 'lobbies', currentLobbyId), {
            boardCards: allCards.map(c => ({ id: c.getId(), word: c.getWord(), type: c.getCardType(), revealed: c.isRevealed() }))
          });
        }
        if (result === 'win') {
          currentGame!.setStatus('Won');
          currentGame!.endMatch();
          gameContainer.innerHTML = `<div style="text-align:center;padding:60px;color:#2ecc71;font-size:2rem;font-weight:bold;">You Win! All green cards revealed.</div>`;
        } else if (result === 'loss') {
          currentGame!.setStatus('Lost');
          currentGame!.endMatch();
          gameContainer.innerHTML = `<div style="text-align:center;padding:60px;color:#e74c3c;font-size:2rem;font-weight:bold;">Game Over! The assassin was revealed.</div>`;
        } else {
          renderBoard();
        }
      });
      boardGrid.appendChild(el);
    });
    gameContainer.appendChild(boardGrid);
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

function init() { initAuth(); renderHomePage(); }
init();