// Game is the central model that owns the board, players, turn counter,
// difficulty, status, timer, and key map for one match session.
import { Player } from "./Player"
import { Board } from "./Board"
import { Turn } from "./Turn"
import { Card } from "./Card"
import { Timer } from "./Timer"
import { KeyMap } from "./KeyMap"

export class Game {

  // Core game state
  private _players: Player[]
  private board: Board
  private currentTurn: Turn
  private turnCounter: number
  private difficulty: string
  // Lifecycle status: 'Created' → active play → 'Won' / 'Lost' → 'Ended'
  private status: string = 'Created'
  private _hostPlayer: Player | null = null
  // Timer instance — duration is set from the lobby timerDuration setting
  private _timer: Timer | null = null
  // KeyMap provides fast card-id → type lookups without iterating the board
  private keyMap: KeyMap | null = null

  constructor(players: Player[], difficulty: string) {
    this._players = players
    this.board = new Board()
    this.currentTurn = new Turn("")
    this.turnCounter = 0
    this.difficulty = difficulty
  }

  // Initialization and Setup
  // Sets up the board, grid, timer, and key map — must be called before the game starts
  initializeGameData(): void {
    this.board.generateBoard(this.difficulty)
    this.board.createGrid()
    this.createTimer()
    const cards = (this.board as any).cards as Card[]
    this.keyMap = new KeyMap()
    this.keyMap.createKeyMap(cards)
    this.board.assignCards()
    this.setStatus('Created')
  }

  // Instantiates the Timer model — actual countdown is handled by main.ts via setInterval
  createTimer(): void {
    this._timer = new Timer()
  }

  // Turn and Round Management
  // Ends the current guessing phase via the Turn model — used by the OOP layer
  endGuessingPhase(): void {
    this.currentTurn.endTurn()
    console.log('Guessing phase ended')
  }

  // Replaces the player list — used when roles need to be reassigned mid-session
  assignRoles(players: Player[]): void {
    this._players = players
  }

  // Marks the first round as started by setting the turn counter to 1
  startFirstRound(): void {
    this.turnCounter = 1
  }

  // Increments the turn counter each time a turn starts or switches
  updateTurnCounter(): void {
    this.turnCounter++
  }

  // Win/Loss Evaluation
  // Checks board state for win/loss conditions:
  // loss — any ASSASSIN card has been revealed
  // win — all GREEN cards have been revealed
  // null — game is still in progress
  checkWinCondition(): 'win' | 'loss' | null {
    const cards = (this.board as any).cards as Card[]
    const assassinRevealed = cards.some(c => c.getCardType() === 'ASSASSIN' && c.isRevealed())
    if (assassinRevealed) return 'loss'
    const allGreenRevealed = cards.filter(c => c.getCardType() === 'GREEN').every(c => c.isRevealed())
    if (allGreenRevealed) return 'win'
    return null
  }

  // Evaluates a guess result after a card has been revealed — delegates to checkWinCondition
  evaluateGuess(_card: Card): 'win' | 'loss' | 'continue' {
    const result = this.checkWinCondition()
    if (result === 'win') return 'win'
    if (result === 'loss') return 'loss'
    return 'continue'
  }

  // Status Management
  // Updates the game lifecycle status string
  setStatus(status: string): void {
    this.status = status
  }

  // Returns the current status — used by syncGameState to guard win/loss screens
  getStatus(): string {
    return this.status
  }

  // Finalises the match by setting status to 'Ended' — called after win or loss
  endMatch(): void {
    this.setStatus('Ended')
    console.log('Match ended')
  }

  // Records which player is the host — used by RoomController.startMatch()
  associateHost(hostPlayer: Player): void {
    this._hostPlayer = hostPlayer
  }

}