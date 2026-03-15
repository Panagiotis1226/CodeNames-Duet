export class Player {
  private playerId: string
  private playerName: string
  private isHost: boolean
  private connected: boolean

  constructor(playerId: string, playerName: string, isHost: boolean = false) {
    this.playerId = playerId
    this.playerName = playerName
    this.isHost = isHost
    this.connected = true
  }

  getId(): string { return this.playerId }
  getName(): string { return this.playerName }

  joinRoom(inviteCode: string): void {
    console.log(`${this.playerName} joining room ${inviteCode}`)
  }

  createClue(word: string, number: number) {
    return { word, number }
  }

  guessCard(cardId: string): void {
    console.log(`${this.playerName} guessed card ${cardId}`)
  }
}