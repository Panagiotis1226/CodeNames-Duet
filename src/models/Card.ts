import { CardType } from "./CardType"

export class Card {

  private cardId: string
  private word: string
  private cardType: string
  private revealed: boolean
  private identified: boolean

  constructor(cardId: string, word: string, cardType: string) {
    this.cardId = cardId
    this.word = word
    this.cardType = cardType
    this.revealed = false
    this.identified = false
  }

  reveal(): void {
    this.revealed = true
  }

  markAsIdentified(): void {
    this.identified = true
  }

  getCardType(): string {
    return this.cardType
  }

  getWord(): string {
    return this.word
  }

  getId(): string {
    return this.cardId
  }

  isRevealed(): boolean {
    return this.revealed
  }

}
