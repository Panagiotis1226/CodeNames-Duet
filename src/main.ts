import { Player } from "./models/Player"
import { Room } from "./models/Room"
import { LANService } from "./services/LANService"
import { RoomController } from "./controllers/RoomController"
import { Game } from "./models/Game"
import { Turn } from "./models/Turn"
import { TurnController } from "./controllers/TurnController"

const app = document.getElementById("app") as HTMLDivElement
const gameContainer = document.getElementById("game-container") as HTMLDivElement

let currentRoom: Room | null = null
let currentRoomController: RoomController | null = null
let currentGame: Game | null = null
let currentTurnController: TurnController | null = null

function generateLobbyCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let code = ""

  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  return code
}

function renderHomePage(): void {
  app.innerHTML = `
    <h1 class="home-title">CODENAMES</h1>
    <p class="home-subtitle">Duet Edition</p>

    <button id="createLobbyBtn" class="btn btn-primary">Create Lobby</button>

    <div class="join-section">
      <h3>Join Existing Lobby</h3>
      <input type="text" id="lobbyCodeInput" class="input-code" placeholder="ENTER CODE" maxlength="6">
      <button id="joinLobbyBtn" class="btn btn-secondary">Join Lobby</button>
    </div>
  `

  gameContainer.innerHTML = `<canvas id="gameCanvas" width="800" height="600"></canvas>`

  const createLobbyBtn = document.getElementById("createLobbyBtn") as HTMLButtonElement
  const joinLobbyBtn = document.getElementById("joinLobbyBtn") as HTMLButtonElement

  createLobbyBtn.addEventListener("click", handleCreateLobby)
  joinLobbyBtn.addEventListener("click", handleJoinLobby)
}

function renderLobbyPage(lobbyCode: string): void {
  app.innerHTML = `
    <h1 class="home-title">LOBBY</h1>
    <p class="home-subtitle">Lobby Created Successfully</p>

    <div class="lobby-code-container">
      <div class="lobby-code-display">${lobbyCode}</div>
    </div>

    <div class="players-section">
      <h3>Players</h3>
      <div class="player-item">
        <span>Player 1 (Host)</span>
      </div>
      <div class="player-item">
        <span>Player 2</span>
      </div>
    </div>

    <div class="settings-section">
      <h3>Game Settings</h3>
      <div class="setting-row">
        <span class="setting-label">Difficulty</span>
        <select id="difficultySelect">
          <option value="easy">Easy</option>
          <option value="normal" selected>Normal</option>
          <option value="hard">Hard</option>
        </select>
      </div>
    </div>

    <button id="startGameBtn" class="btn btn-primary">Start Match</button>
    <button id="backBtn" class="btn btn-secondary">Back</button>
  `

  const startGameBtn = document.getElementById("startGameBtn") as HTMLButtonElement
  const backBtn = document.getElementById("backBtn") as HTMLButtonElement
  const difficultySelect = document.getElementById("difficultySelect") as HTMLSelectElement

  difficultySelect.addEventListener("change", () => {
    if (currentRoomController !== null) {
      currentRoomController.setDifficulty(difficultySelect.value)
    }
  })

  startGameBtn.addEventListener("click", handleStartMatch)
  backBtn.addEventListener("click", renderHomePage)
}

function handleCreateLobby(): void {
  const hostPlayer = new Player("1", "Player 1", true)
  const lobbyCode = generateLobbyCode()

  currentRoom = new Room(lobbyCode, hostPlayer)
  const lanService = new LANService()
  currentRoomController = new RoomController(currentRoom, lanService)

  currentRoomController.createRoom(hostPlayer)
  currentRoomController.setDifficulty("normal")

  renderLobbyPage(lobbyCode)
}

function handleJoinLobby(): void {
  const lobbyCodeInput = document.getElementById("lobbyCodeInput") as HTMLInputElement
  const code = lobbyCodeInput.value.trim().toUpperCase()

  if (code.length !== 6) {
    alert("Please enter a valid 6-character lobby code.")
    return
  }

  const hostPlayer = new Player("1", "Player 1", true)
  const guestPlayer = new Player("2", "Player 2", false)

  currentRoom = new Room(code, hostPlayer)
  const lanService = new LANService()
  currentRoomController = new RoomController(currentRoom, lanService)

  currentRoomController.createRoom(hostPlayer)
  currentRoomController.joinRoom(guestPlayer, code)

  renderLobbyPage(code)
}

function handleStartMatch(): void {
  if (currentRoomController === null) {
    alert("No room available.")
    return
  }

  currentRoomController.startMatch()

  const hostPlayer = new Player("1", "Player 1", true)
  const guestPlayer = new Player("2", "Player 2", false)

  currentGame = new Game([hostPlayer, guestPlayer], "normal")
  currentGame.initializeGameData()
  currentGame.startFirstRound()

  const turn = new Turn("1")
  currentTurnController = new TurnController(turn, currentGame)
  currentTurnController.startTurn("1")

  renderBoard()
}

function renderBoard(): void {
  if (currentGame === null) {
    return
  }

  const board = (currentGame as any).board
  const cards = (board as any).cards as any[]

  gameContainer.innerHTML = `
    <div style="
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      padding: 20px;
      width: 800px;
      min-height: 600px;
      box-sizing: border-box;
      align-content: start;
    " id="boardGrid"></div>
  `

  const boardGrid = document.getElementById("boardGrid") as HTMLDivElement

  cards.forEach((card: any) => {
    const cardElement = document.createElement("button")

    cardElement.textContent = card.word
    cardElement.style.padding = "24px 12px"
    cardElement.style.borderRadius = "10px"
    cardElement.style.border = "2px solid #4a4a6a"
    cardElement.style.background = card.revealed ? "#f4d03f" : "#16213e"
    cardElement.style.color = card.revealed ? "#111" : "#fff"
    cardElement.style.fontWeight = "bold"
    cardElement.style.cursor = "pointer"
    cardElement.style.minHeight = "100px"

    cardElement.addEventListener("click", () => {
      board.revealCard(card.cardId)
      renderBoard()
    })

    boardGrid.appendChild(cardElement)
  })
}

renderHomePage()