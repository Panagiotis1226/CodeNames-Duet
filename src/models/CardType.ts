// CardType defines the three possible card categories in the game.
// GREEN = a team card that players want to reveal to win
// NEUTRAL = a bystander card with no consequence
// ASSASSIN = instantly ends the game in a loss if revealed
export enum CardType {
  GREEN = "GREEN",
  NEUTRAL = "NEUTRAL",
  ASSASSIN = "ASSASSIN"
}