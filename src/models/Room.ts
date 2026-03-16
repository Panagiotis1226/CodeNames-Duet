import { Player } from "./Player"
import { Game } from "./Game"

export class Room {

  private inviteCode: string
  private players: Player[]
  private host: Player
  private difficulty: string
  private matchStarted: boolean

  constructor(inviteCode: string, host: Player) {
    this.inviteCode = inviteCode
    this.host = host
    this.players = [host]
    this.difficulty = "normal"
    this.matchStarted = false
  }

  create(): void {
    console.log("Room created with code:", this.inviteCode)
  }

  setHost(player: Player): void {
    this.host = player
  }

  generateInvitationCode(): string {
    return this.inviteCode
  }

  addPlayer(player: Player): void {
    this.players.push(player)
  }

  isMatchStarted(): boolean {
    return this.matchStarted
  }

  setDifficulty(level: string): void {
    this.difficulty = level
    console.log("Room difficulty set to:", this.difficulty)
  }

  hasEnoughPlayers(): boolean {
    return this.players.length >= 2
  }

  isHost(player: Player): boolean {
    return player.getId() === this.host.getId()
  }

  setMatchStarted(value: boolean): void {
    this.matchStarted = value
  }

  createGame(): Game {
    console.log("Creating game...")
    return new Game(this.players, this.difficulty)
  }

}