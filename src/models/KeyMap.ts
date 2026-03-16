import { Card } from "./Card"

export class KeyMap {

  private mapping: Map<string, string>

  constructor() {
    this.mapping = new Map()
  }

  createKeyMap(cards: Card[]): void {
    cards.forEach(card => {
      this.mapping.set(card.getId(), card.getCardType())
    })
  }

  getCardType(cardId: string): string {
    return this.mapping.get(cardId) ?? ''
  }

}
