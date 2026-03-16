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

  joinRoom(player: Player, inviteCode: string): void {
    const room = this.room.getRoom()
    if (room.generateInvitationCode() !== inviteCode) {
      console.log('Invalid invite code')
      return
    }
    if (room.isMatchStarted()) {
      console.log('Match already started, cannot join')
      return
    }
    room.addPlayer(player)
    console.log(`${player.getId()} joined the room`)
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