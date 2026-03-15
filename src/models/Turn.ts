export class Turn {

  private currentPlayerId: string
  private guessingPhaseEnabled: boolean
  private turnEnded: boolean

  constructor(currentPlayerId: string) {
    this.currentPlayerId = currentPlayerId
    this.guessingPhaseEnabled = false
    this.turnEnded = false
  }

  initializeTurn(): void {
    this.guessingPhaseEnabled = false
    this.turnEnded = false
    console.log("Turn initialized")
  }

  enableGuessingPhase(): void {
    this.guessingPhaseEnabled = true
    console.log("Guessing phase enabled")
  }

  endTurn(): void {
    this.turnEnded = true
    console.log("Turn ended")
  }

}