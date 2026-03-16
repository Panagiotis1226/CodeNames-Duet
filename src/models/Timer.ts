export class Timer {

  private duration: number
  private running: boolean

  constructor() {
    this.duration = 0
    this.running = false
  }

  start(): void {
    this.running = true
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
