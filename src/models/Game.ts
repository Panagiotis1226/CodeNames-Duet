import { Player } from "./Player"
import { Board } from "./Board"
import { Turn } from "./Turn"

export class Game {

  private players: Player[]
  private board: Board
  private currentTurn: Turn
  private turnCounter: number
  private difficulty: string

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
    const cards = (this.board as any).cards as any[]
    const assassinRevealed = cards.some((c: any) => c['cardType'] === 'ASSASSIN' && c['revealed'])
    if (assassinRevealed) return 'loss'
    const allGreenRevealed = cards.filter((c: any) => c['cardType'] === 'GREEN').every((c: any) => c['revealed'])
    if (allGreenRevealed) return 'win'
    return null
  }

}