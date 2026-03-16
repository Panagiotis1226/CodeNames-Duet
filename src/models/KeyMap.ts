// KeyMap provides an O(1) lookup of a card's type by its ID.
// Built once at game initialisation from the full card list,
// it avoids iterating the board array every time a type check is needed.
import { Card } from "./Card"

export class KeyMap {

  // Maps cardId → cardType ('GREEN', 'NEUTRAL', or 'ASSASSIN')
  private mapping: Map<string, string>

  constructor() {
    this.mapping = new Map()
  }

  // Populates the map from the board's card list — called during Game.initializeGameData()
  createKeyMap(cards: Card[]): void {
    cards.forEach(card => {
      this.mapping.set(card.getId(), card.getCardType())
    })
  }

  // Returns the card type for a given ID, or an empty string if not found
  getCardType(cardId: string): string {
    return this.mapping.get(cardId) ?? ''
  }

}