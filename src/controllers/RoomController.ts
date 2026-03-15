import { Player } from '../models/Player'
import { Room } from '../models/Room'

export class RoomController {
  private room: Room

  constructor(room: Room) {
    this.room = room
  }

  createRoom(hostPlayer: Player): void {
    this.room.setHost(hostPlayer)
    this.room.create()
    console.log('Room created')
  }

  setDifficulty(level: string): void {
    this.room.setDifficulty(level)
    console.log('Difficulty set to:', level)
  }

  startMatch(): void {
    if (this.room.hasEnoughPlayers() && !this.room.isMatchStarted()) {
      this.room.createGame()
      console.log('Match started')
    }
  }
}