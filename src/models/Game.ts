import { Player } from "./Player"
import { Board } from "./Board"
import { Turn } from "./Turn"
import { Card } from "./Card"

export class Game {

  private players: Player[]
  private board: Board
  private currentTurn: Turn
  private turnCounter: number
  private difficulty: string
  private status: string = 'Created'
  private hostPlayer: Player | null = null

  constructor(players: Player[], difficulty: string) {
    this.players = players
    this.board = new Board()
    this.currentTurn = new Turn("")
    this.turnCounter = 0
    this.difficulty = difficulty
  }

  initializeGameData(): void {
    this.board.generateBoard()
  }

  assignRoles(players: Player[]): void {
    this.players = players
  }

  startFirstRound(): void {
    this.turnCounter = 1
  }

  updateTurnCounter(): void {
    this.turnCounter++
  }

  checkWinCondition(): 'win' | 'loss' | null {
    const cards = (this.board as any).cards as Card[]
    const assassinRevealed = cards.some(c => c.getCardType() === 'ASSASSIN' && c.isRevealed())
    if (assassinRevealed) return 'loss'
    const allGreenRevealed = cards.filter(c => c.getCardType() === 'GREEN').every(c => c.isRevealed())
    if (allGreenRevealed) return 'win'
    return null
  }

  evaluateGuess(card: Card): 'win' | 'loss' | 'continue' {
    const result = this.checkWinCondition()
    if (result === 'win') return 'win'
    if (result === 'loss') return 'loss'
    return 'continue'
  }

  setStatus(status: string): void {
    this.status = status
  }

  getStatus(): string {
    return this.status
  }

  endMatch(): void {
    this.setStatus('Ended')
    console.log('Match ended')
  }

  associateHost(hostPlayer: Player): void {
    this.hostPlayer = hostPlayer
  }

}