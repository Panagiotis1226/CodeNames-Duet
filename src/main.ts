import { db, auth } from './firebase';
import { collection, addDoc, doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';

const app = document.getElementById('app')!;

// Initialize anonymous auth
async function initAuth() {
  try {
    await signInAnonymously(auth);
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
  const user = auth.currentUser;
  if (!user) {
    // Show lobby page immediately with loading state
    const lobbyCode = generateLobbyCode();
    renderLobbyPage(lobbyCode, true);

    // Wait for auth then create in background
    await initAuth();
    const newUser = auth.currentUser;
    if (!newUser) {
      alert('Authentication failed. Please refresh.');
      return;
    }

    try {
      await addDoc(collection(db, 'lobbies'), {
        code: lobbyCode,
        hostId: newUser.uid,
        players: [{
          id: newUser.uid,
          name: 'Player 1',
          isHost: true,
          role: null
        }],
        status: 'waiting',
        createdAt: new Date()
      });
      // Update UI to show lobby is ready
      updateLobbyStatus('ready');
    } catch (error) {
      console.error('Error creating lobby:', error);
      alert('Failed to create lobby. Please try again.');
      renderHomePage();
    }
    return;
  }

  const lobbyCode = generateLobbyCode();

  try {
    await addDoc(collection(db, 'lobbies'), {
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

    renderLobbyPage(lobbyCode, false);
  } catch (error) {
    console.error('Error creating lobby:', error);
    alert('Failed to create lobby. Please try again.');
  }
}

// Join an existing lobby
async function joinLobby(code: string) {
  const user = auth.currentUser;
  if (!user) {
    alert('Please wait, authenticating...');
    return;
  }

  // TODO: Implement join lobby logic in next step
  console.log('Joining lobby:', code);
}

// Render lobby page
function renderLobbyPage(lobbyCode: string, isLoading: boolean) {
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
        <div class="player-item">
          <span>Player 1</span>
          <span class="player-host">Host</span>
        </div>
        <div class="player-item" style="opacity: 0.5;">
          <span>Waiting for player...</span>
        </div>
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

    <button id="startGameBtn" class="btn btn-primary" ${isLoading ? 'disabled' : ''}>
      ${isLoading ? 'Creating Lobby...' : 'Start Game'}
    </button>

    ${isLoading ? '<p style="color: #888; margin-top: 15px;">Setting up lobby...</p>' : ''}
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

  // Start game placeholder
  document.getElementById('startGameBtn')?.addEventListener('click', () => {
    if (!isLoading) {
      alert('Start Game - Coming soon!');
    }
  });
}

// Update lobby status
function updateLobbyStatus(status: string) {
  const startBtn = document.getElementById('startGameBtn') as HTMLButtonElement;
  const statusText = document.querySelector('p[style*="#888"]');

  if (startBtn && status === 'ready') {
    startBtn.disabled = false;
    startBtn.textContent = 'Start Game';
  }

  if (statusText && status === 'ready') {
    statusText.remove();
  }
}

// Initialize app
function init() {
  initAuth();
  renderHomePage();
}

init();