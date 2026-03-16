// Board holds the full set of cards for one game and handles generation,
// grid sizing, card lookup, and deterministic reconstruction from Firestore data.
import { Card } from "./Card"

export class Board {

  private cards: Card[]
  // gridSize drives how many columns are rendered (3 for easy, 5 for normal/hard)
  private gridSize: number

  // Fixed word pool — words are shuffled and sliced to fill each board
  private wordPool: string[] = [
    'APPLE', 'MOON', 'TRAIN', 'SHADOW', 'RIVER', 'LIGHT', 'BRIDGE', 'CLOUD', 'STONE',
    'FIRE', 'WATER', 'FOREST', 'CASTLE', 'SWORD', 'SHIELD', 'CROWN', 'MIRROR',
    'GHOST', 'TOWER', 'ANCHOR', 'ARROW', 'BARREL', 'CAVE', 'DESERT', 'ENGINE'
  ]

  constructor() {
    this.cards = []
    this.gridSize = 3
  }

  // Fisher-Yates shuffle — returns a new shuffled copy of the input array
  private shuffle(arr: string[]): string[] {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  // Generates a fresh randomised board based on difficulty.
  // easy: 9 cards (3 green, 1 assassin)
  // normal: 25 cards (9 green, 3 assassin)
  // hard: 25 cards (11 green, 3 assassin)
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
    // Build and shuffle the type array so card roles are randomly distributed
    const types: string[] = [
      ...Array(green).fill('GREEN'),
      ...Array(assassin).fill('ASSASSIN'),
      ...Array(neutral).fill('NEUTRAL')
    ]
    const shuffledTypes = this.shuffle(types)
    this.cards = words.map((word, i) => new Card(String(i + 1), word, shuffledTypes[i]))
  }

  // Sets gridSize based on card count — 3x3 for easy, 5x5 for normal/hard
  createGrid(): void {
    this.gridSize = this.cards.length === 9 ? 3 : 5
    console.log(`Grid created: ${this.gridSize}x${this.gridSize}`)
  }

  // Placeholder confirming cards are ready — kept for OOP layer compatibility
  assignCards(): void {
    console.log(`${this.cards.length} cards assigned to board`)
  }

  // Looks up a single card by its ID — used by PlayerController.makeGuess()
  getCard(cardId: string): Card | undefined {
    return this.cards.find(card => card.getId() === cardId)
  }

  // Reconstructs the board from Firestore data so both clients see the exact same
  // card layout, words, types, and revealed states — avoids RNG divergence between clients
  loadCards(data: { id: string; word: string; type: string; revealed: boolean }[]): void {
    this.cards = data.map(d => {
      const card = new Card(d.id, d.word, d.type)
      if (d.revealed) card.reveal()
      return card
    })
    this.gridSize = this.cards.length === 9 ? 3 : 5
  }

  // Reveals a card by ID — delegates to Card.reveal()
  revealCard(cardId: string): void {
    const selectedCard = this.getCard(cardId)
    if (selectedCard) {
      selectedCard.reveal()
    }
  }

}