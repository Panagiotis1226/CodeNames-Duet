import { Board } from "../models/Board"
import { Game } from "../models/Game"

export class PlayerController {

  private board: Board
  private game: Game

  constructor(board: Board, game: Game) {
    this.board = board
    this.game = game
  }

  makeGuess(cardId: string): 'win' | 'loss' | 'continue' {
    const card = this.board.getCard(cardId)
    if (!card) return 'continue'
    card.reveal()
    if (card.getCardType() === 'GREEN') card.markAsIdentified()
    return this.game.evaluateGuess(card)
  }

}
