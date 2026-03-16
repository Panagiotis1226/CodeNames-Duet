// TurnController is the coordinator between the Turn model and the Game model
// for all turn lifecycle events: starting, submitting a clue, enabling guessing,
// ending a turn, and switching to the next player's turn.
import { Game } from "../models/Game"
import { Turn } from "../models/Turn"

export class TurnController {

  private turn: Turn
  private game: Game

  constructor(turn: Turn, game: Game) {
    this.turn = turn
    this.game = game
  }

  // Resets the Turn model and increments the game's turn counter — called at the beginning of each turn
  startTurn(playerId: string): void {
    this.turn.initializeTurn()
    this.game.updateTurnCounter()
    console.log(`Turn started for player: ${playerId}`)
  }

  // Records the clue on the Turn model and opens the guessing phase for the guesser
  submitClue(word: string, number: number): void {
    this.turn.setClue(word, number)
    this.turn.enableGuessingPhase()
  }

  // Returns whether the guessing phase is currently active — used by renderBoard() to decide UI
  isGuessingEnabled(): boolean {
    return this.turn.isGuessingEnabled()
  }

  // Returns the current clue word and number — displayed in the guessing phase UI
  getClue(): { word: string; number: number } {
    return this.turn.getClue()
  }

  // Marks the current turn as ended on the Turn model
  endTurn(): void {
    this.turn.endTurn()
  }

  // Resets the Turn model for the next player and increments the turn counter
  switchTurn(nextPlayerId: string): void {
    this.turn.initializeTurn()
    this.game.updateTurnCounter()
    console.log(`Turn switched to player: ${nextPlayerId}`)
  }

}