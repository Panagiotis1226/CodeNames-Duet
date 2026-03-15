import { Card } from "./Card"

export class Board {

  private cards: Card[]

  constructor() {
    this.cards = []
  }

  generateBoard(): void {
    this.cards = [
      new Card("1", "APPLE", "GREEN"),
      new Card("2", "MOON", "NEUTRAL"),
      new Card("3", "TRAIN", "GREEN"),
      new Card("4", "SHADOW", "ASSASSIN"),
      new Card("5", "RIVER", "NEUTRAL"),
      new Card("6", "LIGHT", "GREEN"),
      new Card("7", "BRIDGE", "NEUTRAL"),
      new Card("8", "CLOUD", "GREEN"),
      new Card("9", "STONE", "NEUTRAL")
    ]
  }

  revealCard(cardId: string): void {
    const selectedCard = this.cards.find((card: any) => card["cardId"] === cardId)

    if (selectedCard) {
      selectedCard.reveal()
    }
  }

}