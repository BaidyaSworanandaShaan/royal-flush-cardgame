import Player from "./Player.js";
import Deck from "./Deck.js";
import {
  sequenceChecker,
  sameRankOrSuitChecker,
  doubleChecker,
  getHighestCard,
} from "../utils/helper.js";
import { handRanks, RANK_TO_VALUE } from "../utils/constants.js";

export class Game {
  constructor() {
    this.deck = new Deck();
    this.players = [];
    this.activePlayersCount = 0;
    this.totalBetAmount = 0;
    this.round = 1;
    this.minimumBetAmount = 10;
    this.currentPlayerIndex = 0;
    this.gameStarted = false;
  }

  addPlayers(player) {
    const newPlayer = new Player(player.id, player.name, player.balance);
    this.players.push(newPlayer);
    this.activePlayersCount++;

    console.log("Player has been added");
  }

  //   Distribute 3 cards to each players
  distributeCardsToPlayer() {
    console.log("Distributing Cards To Players");
    this.players.forEach((player) => {
      player.hand = [];
    });

    this.deck.shuffleDeck();
    let i = 0;
    while (i < 3) {
      this.players.forEach((player) => {
        player.hand.push(this.deck.cards.shift());
      });
      i++;
    }
  }
  startGame() {
    this.gameStarted = true;
    this.deck.shuffleDeck();
    this.distributeCardsToPlayer();
    this.totalBetAmount = this.players.length * 10;

    this.players.forEach((player) => {
      player.balance -= 10;
    });
    this.minimumBetAmount = 10;
    this.currentPlayerIndex = 0;
    this.round = 1;
    this.activePlayersCount = this.players.length;
    console.log("Game started!");
  }
  // Place bet by each player
  placeBet(player, amount) {
    if (this.players[this.currentPlayerIndex].id !== player.id) {
      return { success: false, message: "Please wait for your turn to bet." };
    }

    if (player.hasFolded) {
      return {
        success: false,
        message: "Card has already been folded. You can't bet.",
      };
    }

    if (player.balance < amount) {
      return {
        success: false,
        message: "Betting amount exceeds your available balance.",
      };
    }

    if (amount < this.minimumBetAmount) {
      return {
        success: false,
        message: `Minimum betting amount is ${this.minimumBetAmount}.`,
      };
    }

    // Bet accepted
    player.balance -= amount;
    this.totalBetAmount += amount;
    this.minimumBetAmount = amount;
    player.currentBet = amount;

    const message = `${player.name} bets ${amount}. Remaining balance: ${player.balance}`;

    console.log(message);
    console.log(`Total Bet Amount: ${this.totalBetAmount}`);

    this.nextTurn();

    return { success: true, message };
  }

  //   Pack cards
  foldPlayer(player) {
    if (this.players[this.currentPlayerIndex]?.id !== player.id) {
      return { success: false, message: "Please wait for your turn." };
    }
    if (player.hasFolded) {
      return {
        success: false,
        message: "Card has already been folded. You can't bet.",
      };
    }

    player.hasFolded = true;
    this.activePlayersCount--;

    if (this.activePlayersCount === 1) {
      const activePlayers = this.getActivePlayers();
      const winner = this.determineWinner(activePlayers);
      return {
        success: true,
        message: `${player.name} packed.`,
        winner: winner,
      };
    } else {
      this.nextTurn();
      console.log(
        `${player.name} has folded. Active players: ${this.activePlayersCount}`
      );
      return {
        success: true,
        message: `${player.name} has folded. Active players: ${this.activePlayersCount}`,
      };
    }
  }
  //   Show cards

  showCards(player) {
    if (this.players[this.currentPlayerIndex].id === player.id) {
      if (!player.hasFolded) {
        console.log(`${player.name} requested for show`);
        const activePlayers = this.getActivePlayers();
        // Reveal cards for every player after show
        activePlayers.forEach((player) => {
          player.revealCards();
        });

        // Check Winner
        const winner = this.determineWinner(activePlayers);
        return {
          success: true,
          message: `${player.name} initiated a show.`,
          winner: winner,
        };
      } else {
        console.log(" You have folded. Cannot show cards.");
        return {
          success: false,
          message: "You have folded. Cannot show cards.",
        };
      }
    } else {
      console.log(" It's not your turn to show cards.");
      return { success: false, message: "It's not your turn to show cards." };
    }
  }
  //   Whose turn is it to fold or bet
  getCurrentPlayer() {
    if (this.players[this.currentPlayerIndex]) {
      console.log(
        `Turn to bet :  ${this.players[this.currentPlayerIndex].name}`
      );
      return this.players[this.currentPlayerIndex];
    }
  }
  //   Next turn to fold or bet
  getNextPlayerIndex() {
    let nextIndex = (this.currentPlayerIndex + 1) % this.players.length;
    while (this.players[nextIndex].hasFolded) {
      nextIndex = (nextIndex + 1) % this.players.length;
      if (nextIndex === this.currentPlayerIndex) break;
    }

    return nextIndex;
  }
  nextTurn() {
    this.currentPlayerIndex = this.getNextPlayerIndex();
  }

  //   getActivePlayers
  getActivePlayers() {
    const activePlayers = this.players.filter(
      (player) => player.hasFolded === false
    );
    return activePlayers;
  }

  getSuitsAndRanksArray(activePlayers) {
    let suits = [];
    let ranks = [];

    activePlayers.forEach((player) => {
      let playerRanks = [];
      let playerSuits = [];

      player.hand.forEach((hand) => {
        playerRanks.push(hand.rank);
        playerSuits.push(hand.suit);
      });

      ranks.push(playerRanks);
      suits.push(playerSuits);
    });

    return { ranks, suits };
  }

  // Get Hand Type

  getHandType(ranks, suits) {
    const finalHandTypesArr = [];
    ranks.forEach((_, index) => {
      console.log(ranks[index]);
      console.log(suits[index]);

      const ranksArray = ranks[index];
      const suitsArray = suits[index];

      const ranksSet = new Set(ranksArray);
      const suitsSet = new Set(suitsArray);

      // Trial Checker
      if (sameRankOrSuitChecker(ranksSet)) {
        finalHandTypesArr.push("Trail");
        console.log("Trial");
        return;
      } else {
        console.log("No Trial");
      }

      // Sort Cards and Map Accoridng to its value
      const values = ranksArray.map((card) => RANK_TO_VALUE[card]);
      const sortedValues = values.sort(function (a, b) {
        return a - b;
      });

      // Double Sequence
      if (sequenceChecker(sortedValues) && sameRankOrSuitChecker(suitsSet)) {
        finalHandTypesArr.push("PureSequence");
        console.log("Double Sequence");
        return;
      }
      // Sequence
      if (sequenceChecker(sortedValues)) {
        finalHandTypesArr.push("Sequence");
        console.log("Sequnce");
        return;
      } else {
        console.log("No Sequence");
      }
      // Color Checker
      if (sameRankOrSuitChecker(suitsSet)) {
        finalHandTypesArr.push("Color");
        console.log("Color");
        return;
      } else {
        console.log("No Color");
      }
      // Double Checker
      if (doubleChecker(ranksSet)) {
        finalHandTypesArr.push("Double");
        console.log("Double");
        return;
      } else {
        console.log("No Double");
      }
      // Get Highest Card
      const highestCard = getHighestCard(sortedValues);
      console.log(highestCard);
      finalHandTypesArr.push("HighCard");
    });

    return finalHandTypesArr;
    console.log("Final " + finalHandTypesArr);
  }

  //   Referred from GPT
  resolveTiePlayersWinner(tiedHandType, tiedPlayers) {
    console.log("Tie Players");
    console.log(tiedHandType);

    const { ranks } = this.getSuitsAndRanksArray(tiedPlayers);
    const sortedtieHandCards = [];

    // Process each rank group and sort their values
    ranks.map((rank) => {
      const values = rank.map((card) => RANK_TO_VALUE[card]);
      const sortedValues = values
        .map((value) => (value === 1 ? 14 : value)) // Treat Ace as 14
        .sort((a, b) => a - b); // Sort the values in ascending order

      sortedtieHandCards.push(sortedValues);
    });

    console.log("Ranks:", ranks);
    console.log("Sorted Tie Hands:", sortedtieHandCards);

    // Function to count the frequency of card values
    const countFrequency = (arr) => {
      const freqMap = {};
      arr.forEach((value) => {
        freqMap[value] = (freqMap[value] || 0) + 1;
      });
      return freqMap;
    };

    // Compare the hands based on the frequency of card values
    const resultIndex = sortedtieHandCards.reduce(
      (maxIndex, currentArr, index) => {
        const currentFreq = countFrequency(currentArr);
        const maxFreq = countFrequency(sortedtieHandCards[maxIndex]);

        const maxCurrent = Math.max(...currentArr);
        const maxMaxIndex = Math.max(...sortedtieHandCards[maxIndex]);

        const maxCurrentFreq = Math.max(...Object.values(currentFreq));
        const maxMaxIndexFreq = Math.max(...Object.values(maxFreq));

        if (maxCurrentFreq > maxMaxIndexFreq) {
          return index;
        }

        if (maxCurrentFreq === maxMaxIndexFreq) {
          const maxCurrentFreqCard = Math.max(
            ...Object.keys(currentFreq)
              .filter((key) => currentFreq[key] === maxCurrentFreq)
              .map(Number)
          );
          const maxMaxIndexFreqCard = Math.max(
            ...Object.keys(maxFreq)
              .filter((key) => maxFreq[key] === maxMaxIndexFreq)
              .map(Number)
          );

          if (maxCurrentFreqCard > maxMaxIndexFreqCard) {
            return index;
          } else if (maxCurrentFreqCard === maxMaxIndexFreqCard) {
            if (maxCurrent > maxMaxIndex) {
              return index;
            }
          }
        }

        return maxIndex;
      },
      0
    ); // Initialize with 0, which means the first player

    return resultIndex;
  }

  findHighestHands(handTypeArr) {
    let maxRank = -1;

    let tieRanks = [];
    handTypeArr.forEach((hand, index) => {
      const handRank = handRanks[hand];
      console.log(handRank);
      if (handRank === maxRank) {
        tieRanks.push(index);
      }
      if (handRank > maxRank) {
        maxRank = handRank;
        tieRanks = [];
        tieRanks.push(index);
      }
    });
    return tieRanks;
  }
  // Determine Winner

  determineWinner(activePlayers) {
    if (!activePlayers || activePlayers.length === 0) {
      console.log("No active players left.");
      return null;
    }
    let winner;
    let winnerIndex = -1;
    const { ranks, suits } = this.getSuitsAndRanksArray(activePlayers);
    console.log(ranks, suits);
    const handTypeArr = this.getHandType(ranks, suits); // Trial Color Sequence
    // Get highest rank cards in an array
    const highestCards = this.findHighestHands(handTypeArr);
    console.log(handTypeArr);
    // Winner if rank is higher and  equals one
    if (highestCards.length === 1) {
      winnerIndex = highestCards[0];
      console.log(winnerIndex);
      winner = activePlayers[winnerIndex];
    } else {
      const tiedHandType = handTypeArr[highestCards[0]];
      const tiedPlayers = activePlayers.filter((_, index) =>
        highestCards.includes(index)
      );
      console.log(tiedPlayers);
      winnerIndex = this.resolveTiePlayersWinner(tiedHandType, tiedPlayers);
      console.log(winnerIndex);
      winner = activePlayers[winnerIndex];
    }

    console.log("Winner: ");

    winner.balance += this.totalBetAmount;
    console.log(winner);
    return winner;
    // this.restartGame();
  }

  //   Restart Game
  restartGame() {
    console.log("Restarting the game...");
    // Reset players' hands and status
    this.players.forEach((player) => {
      player.hand = [];
      player.hasFolded = false;
      player.isBlind = true;
      player.currentBet = 0;
    });

    // Reset deck and shuffle
    this.deck = new Deck();
    this.deck.shuffleDeck();
    this.distributeCardsToPlayer();
    // Reset game-related variables
    this.activePlayersCount = this.players.length;
    this.totalBetAmount = this.players.length * 10;
    this.players.forEach((player) => {
      player.balance -= 10;
    });
    this.round++;
    this.minimumBetAmount = 10;
    this.currentPlayerIndex = 0;
    console.log("Game has been restarted. New round begins!");
    console.log(this.players);
  }
}
