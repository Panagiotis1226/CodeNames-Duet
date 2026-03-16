export class Timer {

  private duration: number
  private _running: boolean

  constructor() {
    this.duration = 0
    this._running = false
  }

  start(): void {
    this._running = true
  }

  stop(): void {
    this.running = false
  }

  reset(): void {
    this.duration = 0
  }

  getDuration(): number {
    return this.duration
  }

}
