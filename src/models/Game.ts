// Central model for one match: owns the board, players, turn counter, difficulty, status, timer, and key map.
import { Player } from "./Player"
import { Board } from "./Board"
import { Turn } from "./Turn"
import { Card } from "./Card"
import { Timer } from "./Timer"
import { KeyMap } from "./KeyMap"

export class Game {

  private _players: Player[]
  private board: Board
  private currentTurn: Turn
  private turnCounter: number
  private difficulty: string
  // lifecycle: 'Created' → active play → 'Won' / 'Lost' → 'Ended'
  private status: string = 'Created'
  private _hostPlayer: Player | null = null
  private _timer: Timer | null = null
  // O(1) card-id → type lookup without iterating the board
  private keyMap: KeyMap | null = null

  constructor(players: Player[], difficulty: string) {
    this._players = players
    this.board = new Board()
    this.currentTurn = new Turn("")
    this.turnCounter = 0
    this.difficulty = difficulty
  }

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

  // Ends the current guessing phase via the Turn model
  endGuessingPhase(): void {
    this.currentTurn.endTurn()
    console.log('Guessing phase ended')
  }

  // Replaces the player list
  assignRoles(players: Player[]): void {
    this._players = players
  }

  // Marks the first round as started by setting the turn counter to 1
  startFirstRound(): void {
    this.turnCounter = 1
  }

  // Increments the turn counter
  updateTurnCounter(): void {
    this.turnCounter++
  }

  // loss if any ASSASSIN is revealed; win if all GREEN cards are revealed; null otherwise
  checkWinCondition(): 'win' | 'loss' | null {
    const cards = (this.board as any).cards as Card[]
    const assassinRevealed = cards.some(c => c.getCardType() === 'ASSASSIN' && c.isRevealed())
    if (assassinRevealed) return 'loss'
    const allGreenRevealed = cards.filter(c => c.getCardType() === 'GREEN').every(c => c.isRevealed())
    if (allGreenRevealed) return 'win'
    return null
  }

  // Evaluates a guess result after a card has been revealed
  evaluateGuess(_card: Card): 'win' | 'loss' | 'continue' {
    const result = this.checkWinCondition()
    if (result === 'win') return 'win'
    if (result === 'loss') return 'loss'
    return 'continue'
  }

  setStatus(status: string): void {
    this.status = status
  }

  // Used by syncGameState to guard win/loss screens
  getStatus(): string {
    return this.status
  }

  // Sets status to 'Ended' — called after win or loss
  endMatch(): void {
    this.setStatus('Ended')
    console.log('Match ended')
  }

  // Records the host player — used by RoomController.startMatch()
  associateHost(hostPlayer: Player): void {
    this._hostPlayer = hostPlayer
  }

}