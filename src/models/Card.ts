import { CardType } from "./CardType"

export class Card {

  private cardId: string
  private word: string
  private cardType: string
  private revealed: boolean

  constructor(cardId: string, word: string, cardType: string) {
    this.cardId = cardId
    this.word = word
    this.cardType = cardType
    this.revealed = false
  }

  reveal(): void {
    this.revealed = true
  }

  getCardType(): string {
    return this.cardType
  }

}