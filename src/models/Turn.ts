export class Turn {

  private _currentPlayerId: string
  private guessingPhaseEnabled: boolean
  private _turnEnded: boolean
  private clueWord: string = ''
  private clueNumber: number = 0

  constructor(currentPlayerId: string) {
    this._currentPlayerId = currentPlayerId
    this.guessingPhaseEnabled = false
    this._turnEnded = false
  }

  initializeTurn(): void {
    this.guessingPhaseEnabled = false
    this._turnEnded = false
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
    this._turnEnded = true
    console.log("Turn ended")
  }

}