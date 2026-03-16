export class Player {
  private playerId: string
  private playerName: string
  private _isHost: boolean
  private _connected: boolean
  private currentClue: { word: string; number: number } | null = null

  constructor(playerId: string, playerName: string, isHost: boolean = false) {
    this.playerId = playerId
    this.playerName = playerName
    this._isHost = isHost
    this._connected = true
  }

  getId(): string { return this.playerId }
  getName(): string { return this.playerName }

  joinRoom(inviteCode: string): void {
    console.log(`${this.playerName} joining room ${inviteCode}`)
  }

  createClue(word: string, number: number): { word: string; number: number } {
    this.currentClue = { word, number }
    return this.currentClue
  }

  getClue(): { word: string; number: number } | null {
    return this.currentClue
  }

  guessCard(cardId: string): void {
    console.log(`${this.playerName} guessed card ${cardId}`)
  }
}