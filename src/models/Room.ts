// Room represents the pre-game lobby state in the OOP layer.
// It holds the player list, host reference, difficulty, invite code,
// and whether the match has started — all managed via RoomController.
import { Player } from "./Player"
import { Game } from "./Game"

export class Room {

  private inviteCode: string
  private players: Player[]
  private host: Player
  private difficulty: string
  // Flag set to true once startMatch() succeeds — prevents late joiners
  private matchStarted: boolean

  constructor(inviteCode: string, host: Player) {
    this.inviteCode = inviteCode
    this.host = host
    // Host is automatically the first player in the room
    this.players = [host]
    this.difficulty = "normal"
    this.matchStarted = false
  }

  // Logs room creation — called by RoomController.createRoom()
  create(): void {
    console.log("Room created with code:", this.inviteCode)
  }

  // Replaces the current host — used if host assignment changes
  setHost(player: Player): void {
    this.host = player
  }

  // Returns the invite code used to validate joining players
  generateInvitationCode(): string {
    return this.inviteCode
  }

  // Appends a player to the room's player list
  addPlayer(player: Player): void {
    this.players.push(player)
  }

  // Returns whether the match has already been started
  isMatchStarted(): boolean {
    return this.matchStarted
  }

  // Persists the difficulty setting chosen in the lobby
  setDifficulty(level: string): void {
    this.difficulty = level
    console.log("Room difficulty set to:", this.difficulty)
  }

  // Returns true when at least 2 players are present — required to start the match
  hasEnoughPlayers(): boolean {
    return this.players.length >= 2
  }

  // Checks whether the given player is the designated host of this room
  isHost(player: Player): boolean {
    return player.getId() === this.host.getId()
  }

  // Sets the matchStarted flag — prevents additional players from joining mid-game
  setMatchStarted(value: boolean): void {
    this.matchStarted = value
  }

  // Self-reference accessor — used by RoomController to operate on the Room instance
  getRoom(): Room {
    return this
  }

  // Creates and returns a new Game instance seeded with the current players and difficulty
  createGame(): Game {
    console.log("Creating game...")
    return new Game(this.players, this.difficulty)
  }

}