// PlayerController bridges the Board and Game models for the guessing action.
// It is the single point responsible for revealing a card and evaluating
// whether the guess results in a win, loss, or continuation.
import { Board } from "../models/Board"
import { Game } from "../models/Game"

export class PlayerController {

  private board: Board
  private game: Game

  constructor(board: Board, game: Game) {
    this.board = board
    this.game = game
  }

  // Reveals the card with the given ID, marks it as identified if GREEN,
  // then asks the Game to evaluate whether the board is in a win/loss state.
  // Returns 'win', 'loss', or 'continue' which main.ts uses to decide what to render next.
  makeGuess(cardId: string): 'win' | 'loss' | 'continue' {
    const card = this.board.getCard(cardId)
    if (!card) return 'continue'
    card.reveal()
    if (card.getCardType() === 'GREEN') card.markAsIdentified()
    return this.game.evaluateGuess(card)
  }

}