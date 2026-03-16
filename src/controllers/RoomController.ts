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

  startMatch(hostPlayer: Player): void {
    if (this.room.isHost(hostPlayer) && this.room.hasEnoughPlayers() && !this.room.isMatchStarted()) {
      const game = this.room.createGame()
      game.associateHost(hostPlayer)
      game.setStatus('Created')
      this.room.setMatchStarted(true)
      console.log('Match started')
    }
  }
}