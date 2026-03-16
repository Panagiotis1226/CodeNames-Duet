export class Timer {

  private duration: number
  private _running: boolean

  constructor() {
    this.duration = 0
    this._running = false
  }

  setDuration(seconds: number): void {
    this.duration = seconds
  }

  start(): void {
    this._running = true
  }

  stop(): void {
    this._running = false
  }

  reset(): void {
    this.duration = 0
  }

  getDuration(): number {
    return this.duration
  }

  isRunning(): boolean {
    return this._running
  }

}