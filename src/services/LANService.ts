import { Room } from "../models/Room"

export class LANService {

  private connectedRoom: Room | null

  constructor() {
    this.connectedRoom = null
  }

  connectToHost(inviteCode: string): boolean {
    console.log(`Connecting to host with invite code: ${inviteCode}`)
    return true
  }

  getRoom(): Room | null {
    return this.connectedRoom
  }

  setRoom(room: Room): void {
    this.connectedRoom = room
  }

}