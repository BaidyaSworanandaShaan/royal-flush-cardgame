import { RANKS, SUITS } from "../utils/constants.js";
import Card from "./Card.js";

class Deck {
  constructor() {
    this.cards = [];
    this.initialiseDeck();
  }
  //  Prepare a deck of cards
  initialiseDeck() {
    for (let i = 0; i < SUITS.length; i++) {
      for (let j = 0; j < RANKS.length; j++) {
        const card = new Card(SUITS[i], RANKS[j]);
        this.cards.push(card);
      }
    }
  }

  //   Shuffle cards using Fisher–Yates shuffle alogrithm
  shuffleDeck() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const randomIndex = Math.floor(Math.random() * i);
      const cardA = this.cards[i];
      const cardB = this.cards[randomIndex];
      this.cards[i] = cardB;
      this.cards[randomIndex] = cardA;
    }
  }
}
export default Deck;
