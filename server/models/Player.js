class Player {
  constructor(id, name, balance) {
    this.id = id;
    this.name = name;
    this.hand = [];
    this.balance = balance;
    this.isBlind = true;
    this.hasFolded = false;
    this.currentBet = 0;
  }
  displayHand() {
    if (this.isBlind) {
      return ["?", "?", "?"];
    } else {
      this.hand.forEach((card) => {
        console.log(card);
      });
      return this.hand;
    }
  }
  revealCards() {
    this.isBlind = false;
    console.log(`${this.name} is seen. `);

    this.displayHand();
  }
}
export default Player;
