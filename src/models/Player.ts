// Player represents one participant in the game.
// Stores identity (id, name, host flag), connection state,
// and the clue the player most recently created.
export class Player {
  private playerId: string
  private playerName: string
  private _isHost: boolean
  private _connected: boolean
  // Holds the last clue this player submitted — null until createClue() is called
  private currentClue: { word: string; number: number } | null = null

  constructor(playerId: string, playerName: string, isHost: boolean = false) {
    this.playerId = playerId
    this.playerName = playerName
    this._isHost = isHost
    this._connected = true
  }

  // Returns the Firebase uid used to identify this player across clients
  getId(): string { return this.playerId }
  // Returns the display name shown in the lobby and turn banner
  getName(): string { return this.playerName }

  // Logs that the player is joining a room — informational, room logic is in RoomController
  joinRoom(inviteCode: string): void {
    console.log(`${this.playerName} joining room ${inviteCode}`)
  }

  // Stores the submitted clue locally and returns it so TurnController can record it
  createClue(word: string, number: number): { word: string; number: number } {
    this.currentClue = { word, number }
    return this.currentClue
  }

  // Returns the player's current clue — null if no clue has been submitted yet
  getClue(): { word: string; number: number } | null {
    return this.currentClue
  }

  // Logs that the player guessed a card — actual reveal logic is in PlayerController
  guessCard(cardId: string): void {
    console.log(`${this.playerName} guessed card ${cardId}`)
  }
}