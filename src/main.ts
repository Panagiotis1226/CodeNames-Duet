import { db, auth } from './firebase';
import { collection, addDoc, doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';

const app = document.getElementById('app')!;

// Store current lobby listener for cleanup
let currentLobbyUnsubscribe: (() => void) | null = null;
let currentLobbyId: string | null = null;

// Initialize anonymous auth
async function initAuth() {
  try {
    // Check if we already have a user
    if (auth.currentUser) {
      console.log('Already authenticated:', auth.currentUser.uid);
      return;
    }
    const result = await signInAnonymously(auth);
    console.log('New anonymous auth:', result.user.uid);
  } catch (error) {
    console.error('Auth error:', error);
  }
}

// Generate random lobby code
function generateLobbyCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Render homepage
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

  document.getElementById('createLobbyBtn')?.addEventListener('click', createLobby);
  document.getElementById('joinLobbyBtn')?.addEventListener('click', () => {
    const code = (document.getElementById('lobbyCodeInput') as HTMLInputElement).value.toUpperCase();
    if (code.length === 6) {
      joinLobby(code);
    } else {
      alert('Please enter a valid 6-character lobby code');
    }
  });
}

// Create a new lobby
async function createLobby() {
  // Show lobby page immediately with loading state
  const lobbyCode = generateLobbyCode();
  let user = auth.currentUser;

  if (!user) {
    await initAuth();
    user = auth.currentUser;
  }

  if (!user) {
    alert('Authentication failed. Please refresh.');
    renderHomePage();
    return;
  }

  try {
    const docRef = await addDoc(collection(db, 'lobbies'), {
      code: lobbyCode,
      hostId: user.uid,
      players: [{
        id: user.uid,
        name: 'Player 1',
        isHost: true,
        role: null
      }],
      status: 'waiting',
      createdAt: new Date()
    });

    currentLobbyId = docRef.id;
    // Start listening for updates
    listenToLobby(docRef.id);
  } catch (error) {
    console.error('Error creating lobby:', error);
    alert('Failed to create lobby. Please try again.');
    renderHomePage();
  }
}

// Join an existing lobby
async function joinLobby(code: string) {
  // Show joining state immediately
  const joinBtn = document.getElementById('joinLobbyBtn') as HTMLButtonElement;
  if (joinBtn) {
    joinBtn.textContent = 'Joining...';
    joinBtn.disabled = true;
  }

  // Ensure auth
  let user = auth.currentUser;
  if (!user) {
    await initAuth();
    user = auth.currentUser;
    if (!user) {
      alert('Authentication failed. Please try again.');
      if (joinBtn) {
        joinBtn.textContent = 'Join Lobby';
        joinBtn.disabled = false;
      }
      return;
    }
  }

  try {
    // Find lobby by code
    const { getDocs, query, where } = await import('firebase/firestore');
    const q = query(collection(db, 'lobbies'), where('code', '==', code));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      alert('Lobby not found. Please check the code and try again.');
      if (joinBtn) {
        joinBtn.textContent = 'Join Lobby';
        joinBtn.disabled = false;
      }
      return;
    }

    const lobbyDoc = snapshot.docs[0];
    const lobbyData = lobbyDoc.data();

    // Check if lobby is full (max 2 players for Duet)
    if (lobbyData.players && lobbyData.players.length >= 2) {
      alert('This lobby is full.');
      if (joinBtn) {
        joinBtn.textContent = 'Join Lobby';
        joinBtn.disabled = false;
      }
      return;
    }

    // Check if user is already in lobby
    const alreadyInLobby = lobbyData.players?.some((p: { id: string }) => p.id === user.uid);
    if (alreadyInLobby) {
      // Just navigate to lobby and start listening
      currentLobbyId = lobbyDoc.id;
      listenToLobby(lobbyDoc.id);
      return;
    }

    // Add player to lobby
    const newPlayer = {
      id: user.uid,
      name: `Player ${lobbyData.players?.length + 1 || 2}`,
      isHost: false,
      role: null
    };

    await updateDoc(doc(db, 'lobbies', lobbyDoc.id), {
      players: [...(lobbyData.players || []), newPlayer]
    });

    // Navigate to lobby and start listening
    currentLobbyId = lobbyDoc.id;
    listenToLobby(lobbyDoc.id);

  } catch (error) {
    console.error('Error joining lobby:', error);
    alert('Failed to join lobby. Please try again.');
    if (joinBtn) {
      joinBtn.textContent = 'Join Lobby';
      joinBtn.disabled = false;
    }
  }
}

// Listen to lobby updates
function listenToLobby(lobbyId: string) {
  // Clean up previous listener
  if (currentLobbyUnsubscribe) {
    currentLobbyUnsubscribe();
  }

  currentLobbyUnsubscribe = onSnapshot(doc(db, 'lobbies', lobbyId), (snapshot) => {
    if (!snapshot.exists()) {
      alert('Lobby was closed.');
      renderHomePage();
      return;
    }

    const lobbyData = snapshot.data();
    const currentUser = auth.currentUser;

    console.log('Lobby update:', {
      lobbyId: snapshot.id,
      hostId: lobbyData.hostId,
      currentUserId: currentUser?.uid,
      players: lobbyData.players,
      isHost: lobbyData.hostId === currentUser?.uid
    });

    if (!currentUser) return;

    // Check if this user is the host
    const isHost = lobbyData.hostId === currentUser.uid;

    // Render appropriate lobby view
    if (isHost) {
      renderHostLobbyPage(lobbyData.code, lobbyData);
    } else {
      renderPlayerLobbyPage(lobbyData.code, lobbyData);
    }
  });
}

// Render host lobby page with real-time updates
function renderHostLobbyPage(lobbyCode: string, lobbyData: any) {
  const players = lobbyData.players || [];
  const currentUser = auth.currentUser;

  const playersHtml = players.map((p: { id: string; name: string; isHost: boolean }) => {
    const isCurrentUser = p.id === currentUser?.uid;
    const nameEditHtml = isCurrentUser ?
      `<input type="text" class="name-edit-input" id="nameInput" value="${p.name}" maxlength="15">
       <button class="edit-name-btn" id="saveNameBtn">Save</button>` :
      `<span>${p.name}</span>`;
    return `
      <div class="player-item" data-player-id="${p.id}">
        ${nameEditHtml}
        ${isCurrentUser ? '(You)' : ''}
        ${p.isHost ? '<span class="player-host">Host</span>' : ''}
      </div>
    `;
  }).join('');

  const waitingSlot = players.length < 2 ?
    '<div class="player-item" style="opacity: 0.5;"><span>Waiting for player...</span></div>' : '';

  app.innerHTML = `
    <h1 class="home-title">LOBBY</h1>
    <p class="home-subtitle">Share this code with your partner</p>

    <div class="lobby-code-container">
      <div class="lobby-code-display" id="lobbyCode">${lobbyCode}</div>
      <button id="copyBtn" class="copy-btn">Copy</button>
    </div>

    <div class="players-section">
      <h3>Players</h3>
      <div id="playersList">
        ${playersHtml}
        ${waitingSlot}
      </div>
    </div>

    <div class="settings-section">
      <h3>Game Settings</h3>
      <div class="setting-row">
        <span class="setting-label">Difficulty (Board Size)</span>
        <span class="setting-placeholder">[Placeholder]</span>
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

  // Copy button functionality
  document.getElementById('copyBtn')?.addEventListener('click', () => {
    navigator.clipboard.writeText(lobbyCode).then(() => {
      const copyBtn = document.getElementById('copyBtn');
      if (copyBtn) {
        copyBtn.textContent = 'Copied!';
        copyBtn.classList.add('copied');
        setTimeout(() => {
          copyBtn.textContent = 'Copy';
          copyBtn.classList.remove('copied');
        }, 2000);
      }
    });
  });

  // Save name functionality
  const saveNameBtn = document.getElementById('saveNameBtn');
  const nameInput = document.getElementById('nameInput') as HTMLInputElement;

  if (saveNameBtn && nameInput && currentLobbyId) {
    saveNameBtn.addEventListener('click', async () => {
      const newName = nameInput.value.trim();
      if (newName && newName.length > 0 && newName.length <= 15 && currentLobbyId) {
        try {
          const lobbyRef = doc(db, 'lobbies', currentLobbyId);
          const lobbySnap = await getDoc(lobbyRef);
          if (lobbySnap.exists()) {
            const data = lobbySnap.data();
            const updatedPlayers = data.players.map((p: { id: string; name: string }) =>
              p.id === currentUser?.uid ? { ...p, name: newName } : p
            );
            await updateDoc(lobbyRef, { players: updatedPlayers });
          }
        } catch (error) {
          console.error('Error updating name:', error);
          alert('Failed to update name. Please try again.');
        }
      }
    });

    // Allow Enter key to save
    nameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        saveNameBtn.click();
      }
    });
  }
  document.getElementById('startGameBtn')?.addEventListener('click', () => {
    if (players.length >= 2) {
      alert('Start Game - Coming soon!');
    }
  });
}

// Render player (non-host) lobby page with real-time updates
function renderPlayerLobbyPage(lobbyCode: string, lobbyData: any) {
  const players = lobbyData.players || [];
  const currentUser = auth.currentUser;

  const playersHtml = players.map((p: { id: string; name: string; isHost: boolean }) => {
    const isCurrentUser = p.id === currentUser?.uid;
    const nameEditHtml = isCurrentUser ?
      `<input type="text" class="name-edit-input" id="nameInput" value="${p.name}" maxlength="15">
       <button class="edit-name-btn" id="saveNameBtn">Save</button>` :
      `<span>${p.name}</span>`;
    return `
      <div class="player-item" data-player-id="${p.id}">
        ${nameEditHtml}
        ${isCurrentUser ? '(You)' : ''}
        ${p.isHost ? '<span class="player-host">Host</span>' : ''}
      </div>
    `;
  }).join('');

  const waitingSlot = players.length < 2 ?
    '<div class="player-item" style="opacity: 0.5;"><span>Waiting for player...</span></div>' : '';

  app.innerHTML = `
    <h1 class="home-title">LOBBY</h1>
    <p class="home-subtitle">Joined Lobby</p>

    <div class="lobby-code-container">
      <div class="lobby-code-display">${lobbyCode}</div>
    </div>

    <div class="players-section">
      <h3>Players</h3>
      <div id="playersList">
        ${playersHtml}
        ${waitingSlot}
      </div>
    </div>

    <div class="settings-section">
      <h3>Game Settings</h3>
      <div class="setting-row">
        <span class="setting-label">Difficulty (Board Size)</span>
        <span class="setting-placeholder">[Placeholder]</span>
      </div>
      <div class="setting-row">
        <span class="setting-label">Timer</span>
        <span class="setting-placeholder">[Placeholder]</span>
      </div>
    </div>

    <p style="color: #888; margin-top: 20px;">Waiting for host to start the game...</p>
  `;

  // Save name functionality for player view
  const saveNameBtn = document.getElementById('saveNameBtn');
  const nameInput = document.getElementById('nameInput') as HTMLInputElement;

  if (saveNameBtn && nameInput && currentLobbyId) {
    saveNameBtn.addEventListener('click', async () => {
      const newName = nameInput.value.trim();
      if (newName && newName.length > 0 && newName.length <= 15 && currentLobbyId) {
        try {
          const lobbyRef = doc(db, 'lobbies', currentLobbyId);
          const lobbySnap = await getDoc(lobbyRef);
          if (lobbySnap.exists()) {
            const data = lobbySnap.data();
            const updatedPlayers = data.players.map((p: { id: string; name: string }) =>
              p.id === currentUser?.uid ? { ...p, name: newName } : p
            );
            await updateDoc(lobbyRef, { players: updatedPlayers });
          }
        } catch (error) {
          console.error('Error updating name:', error);
          alert('Failed to update name. Please try again.');
        }
      }
    });

    // Allow Enter key to save
    nameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        saveNameBtn.click();
      }
    });
  }
}

// Initialize app
function init() {
  initAuth();
  renderHomePage();
}

init();