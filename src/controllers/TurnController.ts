import { Game } from "../models/Game"
import { Turn } from "../models/Turn"

export class TurnController {

  private turn: Turn
  private game: Game

  constructor(turn: Turn, game: Game) {
    this.turn = turn
    this.game = game
  }

  startTurn(playerId: string): void {
    this.turn.initializeTurn()
    this.turn.enableGuessingPhase()
    this.game.updateTurnCounter()
    console.log(`Turn started for player: ${playerId}`)
  }

}