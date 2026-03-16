// Card represents a single card on the board.
// Each card has a unique ID, a visible word, a type (GREEN/NEUTRAL/ASSASSIN),
// and tracks whether it has been revealed or identified by the team.
export class Card {

  private cardId: string
  private word: string
  private cardType: string
  // revealed = flipped face-up during a guess; identified = correctly guessed as a GREEN card
  private revealed: boolean
  private _identified: boolean

  constructor(cardId: string, word: string, cardType: string) {
    this.cardId = cardId
    this.word = word
    this.cardType = cardType
    this.revealed = false
    this._identified = false
  }

  // Flip the card face-up — called when a player guesses this card
  reveal(): void {
    this.revealed = true
  }

  // Mark the card as correctly identified — only meaningful for GREEN cards
  markAsIdentified(): void {
    this._identified = true
  }

  // Returns the card's type string ('GREEN', 'NEUTRAL', or 'ASSASSIN')
  getCardType(): string {
    return this.cardType
  }

  // Returns the word displayed on the card
  getWord(): string {
    return this.word
  }

  // Returns the unique card ID used to look up this card on the board
  getId(): string {
    return this.cardId
  }

  // Returns true if the card has been flipped face-up
  isRevealed(): boolean {
    return this.revealed
  }

}