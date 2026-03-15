export class Turn {

  private currentPlayerId: string
  private guessingPhaseEnabled: boolean
  private turnEnded: boolean
  private clueWord: string = ''
  private clueNumber: number = 0

  constructor(currentPlayerId: string) {
    this.currentPlayerId = currentPlayerId
    this.guessingPhaseEnabled = false
    this.turnEnded = false
  }

  initializeTurn(): void {
    this.guessingPhaseEnabled = false
    this.turnEnded = false
    this.clueWord = ''
    this.clueNumber = 0
    console.log("Turn initialized")
  }

  setClue(word: string, number: number): void {
    this.clueWord = word
    this.clueNumber = number
  }

  getClue(): { word: string; number: number } {
    return { word: this.clueWord, number: this.clueNumber }
  }

  enableGuessingPhase(): void {
    this.guessingPhaseEnabled = true
    console.log("Guessing phase enabled")
  }

  isGuessingEnabled(): boolean {
    return this.guessingPhaseEnabled
  }

  endTurn(): void {
    this.turnEnded = true
    console.log("Turn ended")
  }

}