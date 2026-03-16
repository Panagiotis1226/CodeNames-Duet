// Timer is a simple model that tracks a countdown duration and running state.
// The actual tick logic lives in main.ts (startGuessTimer) using setInterval —
// this class is used by Game to hold timer metadata and by TurnController if needed.
export class Timer {

  private duration: number
  // Tracks whether the timer is currently counting down
  private _running: boolean

  constructor() {
    this.duration = 0
    this._running = false
  }

  // Sets how many seconds the countdown should run for
  setDuration(seconds: number): void {
    this.duration = seconds
  }

  // Marks the timer as active — actual countdown is driven externally via setInterval
  start(): void {
    this._running = true
  }

  // Stops the timer without resetting the duration
  stop(): void {
    this._running = false
  }

  // Resets duration to 0 — call before reusing the timer for a new turn
  reset(): void {
    this.duration = 0
  }

  // Returns the configured duration in seconds
  getDuration(): number {
    return this.duration
  }

  // Returns true if the timer is currently marked as running
  isRunning(): boolean {
    return this._running
  }

}