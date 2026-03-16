import { Card } from "./Card"

export class Board {

  private cards: Card[]
  private gridSize: number

  private wordPool: string[] = [
    'APPLE', 'MOON', 'TRAIN', 'SHADOW', 'RIVER', 'LIGHT', 'BRIDGE', 'CLOUD', 'STONE',
    'FIRE', 'WATER', 'FOREST', 'CASTLE', 'SWORD', 'SHIELD', 'CROWN', 'MIRROR',
    'GHOST', 'TOWER', 'ANCHOR', 'ARROW', 'BARREL', 'CAVE', 'DESERT', 'ENGINE'
  ]

  constructor() {
    this.cards = []
    this.gridSize = 3
  }

  private shuffle(arr: string[]): string[] {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  generateBoard(difficulty: string = 'normal'): void {
    let total: number, green: number, assassin: number
    if (difficulty === 'easy') {
      total = 9; green = 3; assassin = 1
    } else if (difficulty === 'hard') {
      total = 25; green = 11; assassin = 3
    } else {
      total = 25; green = 9; assassin = 3
    }
    const neutral = total - green - assassin
    const words = this.shuffle(this.wordPool).slice(0, total)
    const types: string[] = [
      ...Array(green).fill('GREEN'),
      ...Array(assassin).fill('ASSASSIN'),
      ...Array(neutral).fill('NEUTRAL')
    ]
    const shuffledTypes = this.shuffle(types)
    this.cards = words.map((word, i) => new Card(String(i + 1), word, shuffledTypes[i]))
  }

  createGrid(): void {
    this.gridSize = this.cards.length === 9 ? 3 : 5
    console.log(`Grid created: ${this.gridSize}x${this.gridSize}`)
  }

  assignCards(): void {
    console.log(`${this.cards.length} cards assigned to board`)
  }

  getCard(cardId: string): Card | undefined {
    return this.cards.find(card => card.getId() === cardId)
  }

  loadCards(data: { id: string; word: string; type: string; revealed: boolean }[]): void {
    this.cards = data.map(d => {
      const card = new Card(d.id, d.word, d.type)
      if (d.revealed) card.reveal()
      return card
    })
    this.gridSize = this.cards.length === 9 ? 3 : 5
  }

  revealCard(cardId: string): void {
    const selectedCard = this.getCard(cardId)
    if (selectedCard) {
      selectedCard.reveal()
    }
  }

}