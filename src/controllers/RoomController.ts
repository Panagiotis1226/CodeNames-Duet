import { Player } from '../models/Player'
import { Room } from '../models/Room'

// RoomController manages the lifecycle of a Room — creating it, adding players,
// setting difficulty, and starting the match. It enforces rules such as
// requiring the host to start the game and blocking late joiners.
export class RoomController {
  private room: Room

  constructor(room: Room) {
    this.room = room
  }

  // Assigns the host to the room and logs creation — used during initial room setup
  createRoom(hostPlayer: Player): void {
    this.room.setHost(hostPlayer)
    this.room.create()
    console.log('Room created')
  }

  // Persists the chosen difficulty level to the Room model
  setDifficulty(level: string): void {
    this.room.setDifficulty(level)
    console.log('Difficulty set to:', level)
  }

  // Validates the invite code and match state before adding the player to the room.
  // The invite code check uses 'active' as the code since Room is constructed that way in main.ts.
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

  // Starts the match if the caller is the host, there are enough players, and it hasn't started yet.
  // Creates a Game via Room.createGame(), associates the host, and locks the room from new joiners.
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