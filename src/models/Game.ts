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

}