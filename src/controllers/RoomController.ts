import { Player } from "../models/Player"
import { Room } from "../models/Room"
import { LANService } from "../services/LANService"

export class RoomController {

  private room: Room
  private lanService: LANService

  constructor(room: Room, lanService: LANService) {
    this.room = room
    this.lanService = lanService
  }

  createRoom(hostPlayer: Player): void {
    this.room.setHost(hostPlayer)
    this.room.create()
    console.log("Room created")
  }

  joinRoom(player: Player, inviteCode: string): void {
    this.lanService.connectToHost(inviteCode)
    this.room.addPlayer(player)
    console.log("Player joined room")
  }

  setDifficulty(level: string): void {
    this.room.setDifficulty(level)
    console.log("Difficulty set")
  }

  startMatch(): void {
    if (this.room.hasEnoughPlayers() && !this.room.isMatchStarted()) {
      this.room.createGame()
      console.log("Match started")
    }
  }

}