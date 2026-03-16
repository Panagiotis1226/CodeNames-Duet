// Turn tracks the state of a single player's turn:
// which player is active, whether the guessing phase is open,
// whether the turn has ended, and the submitted clue.
export class Turn {

  private _currentPlayerId: string
  // Becomes true once a clue is submitted — unlocks card clicking for the guesser
  private guessingPhaseEnabled: boolean
  // Becomes true when endTurn() is called — signals the turn is over
  private _turnEnded: boolean
  private clueWord: string = ''
  private clueNumber: number = 0

  constructor(currentPlayerId: string) {
    this._currentPlayerId = currentPlayerId
    this.guessingPhaseEnabled = false
    this._turnEnded = false
  }

  // Resets all turn state — called at the start of every new turn via TurnController
  initializeTurn(): void {
    this.guessingPhaseEnabled = false
    this._turnEnded = false
    this.clueWord = ''
    this.clueNumber = 0
    console.log("Turn initialized")
  }

  // Stores the clue word and number submitted by the clue giver
  setClue(word: string, number: number): void {
    this.clueWord = word
    this.clueNumber = number
  }

  // Returns the current clue — read by TurnController.getClue() for the UI display
  getClue(): { word: string; number: number } {
    return { word: this.clueWord, number: this.clueNumber }
  }

  // Opens the guessing phase after a clue is submitted — enables card clicks for the guesser
  enableGuessingPhase(): void {
    this.guessingPhaseEnabled = true
    console.log("Guessing phase enabled")
  }

  // Returns whether card clicking is currently allowed
  isGuessingEnabled(): boolean {
    return this.guessingPhaseEnabled
  }

  // Marks the turn as ended — called manually or by the auto-expiry timer
  endTurn(): void {
    this._turnEnded = true
    console.log("Turn ended")
  }

}