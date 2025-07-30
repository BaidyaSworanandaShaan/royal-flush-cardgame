import {
  userInfoSection,
  userCardSection,
  gameOptionsSection,
  gameWinnerSection,
  gameRestartSection,
  placeBetBtn,
  seeCardsBtn,
  packCardsBtn,
  showCardsBtn,
  log,
  createRoomBtn,
  joinRoomBtn,
  lobbySelectionScreen,
  mainGameScreen,
  roomIdEl,
  totalPlayersEl,
  joinRoomScreen,
  btnJoinRoom,
  roomIdInputEl,
  startGameBtn,
  gameInitial,
  gameMain,
  betAmountEl,
  splashScreen,
  clickSound,
  backgroundSound,
  betPlaceSound,
} from "./domSelectors.js";

function speak(text) {
  const msg = new SpeechSynthesisUtterance(text);
  msg.lang = "en-US";
  msg.pitch = 1.2;
  msg.rate = 1.2;
  msg.volume = 0.9;

  window.speechSynthesis.cancel(); // stop any previous speech
  window.speechSynthesis.speak(msg);
}
// fetch userStats from backend
export async function fetchUserStats(username) {
  try {
    const response = await fetch(`/api/auth/getUserStats?username=${username}`);
    if (!response.ok) {
      throw new Error("Failed to fetch user stats");
    }
    const stats = await response.json();
    return stats; // { total_balance, total_games_played }
  } catch (err) {
    console.error("Error:", err.message);
    return null;
  }
}

// Connect to the server
let socket;
let isRoomCreator = false;
let gameStarted = false;
let currentRoomId = null;
let finalWinner = false;
let lastRotatedPlayers = [];

function rotatePlayers(players, you) {
  // First, store original index for each player
  const playersWithIndex = players.map((player, index) => ({
    ...player,
    originalIndex: index,
  }));

  // Then, find the index to rotate from
  const index = playersWithIndex.findIndex(
    (p) => p.name === you || p.id === you
  );
  if (index === -1) return playersWithIndex; // fallback

  // Rotate array
  return [
    ...playersWithIndex.slice(index),
    ...playersWithIndex.slice(0, index),
  ];
}

function renderPlayersOnTable(players, updatedGame, mySocketId) {
  console.log("Current Player Index");
  console.log(updatedGame.currentPlayerIndex);
  const table = document.getElementById("table");

  table.innerHTML = ""; // clear existing
  const { width, height } = table.getBoundingClientRect();
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2.5;
  const playerCount = players.length;

  players.forEach((player, i) => {
    console.log(" Player Index :" + i);

    const angle = ((2 * Math.PI) / playerCount) * i + Math.PI / 2; // start from bottom

    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);

    const playerDiv = document.createElement("div");
    playerDiv.className = "player";
    playerDiv.dataset.id = player.id;
    playerDiv.style.left = `${x}px`;
    playerDiv.style.top = `${y}px`;

    if (player.originalIndex === updatedGame.currentPlayerIndex) {
      playerDiv.classList.add("active-player");
    } else {
      playerDiv.classList.remove("active-player");
    }
    const icon = document.createElement("img");
    icon.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
      player.name
    )}
    )}`;
    icon.alt = `${player.name}'s icon`;

    const nameSpan = document.createElement("span");
    nameSpan.textContent = player.name;

    if (player.id === mySocketId) {
      const balanceSpan = document.createElement("span");
      balanceSpan.textContent = ` (Rs. ${player.balance})`;
      balanceSpan.style.fontWeight = "bold";

      nameSpan.appendChild(balanceSpan);
    }
    playerDiv.appendChild(icon);
    playerDiv.appendChild(nameSpan);

    table.appendChild(playerDiv);

    player.position = { x, y, angle }; // store position for cards
  });
}
// function animateCoinFromPlayerToPot(playerId) {
//   const playerEl = document.querySelector(`.player[data-id="${playerId}"]`);
//   const potEl = document.querySelector(".round-pot");
//   const tableEl = document.getElementById("table");

//   if (!playerEl || !potEl || !tableEl) return;

//   const tableRect = tableEl.getBoundingClientRect();
//   const playerRect = playerEl.getBoundingClientRect();
//   const potRect = potEl.getBoundingClientRect();

//   const startX = playerRect.left + playerRect.width / 2 - tableRect.left;
//   const startY = playerRect.top + playerRect.height / 2 - tableRect.top;
//   const endX = potRect.left + potRect.width / 2 - tableRect.left;
//   const endY = potRect.top + potRect.height / 2 - tableRect.top;

//   const dx = endX - startX;
//   const dy = endY - startY;

//   const coin = document.createElement("div");
//   coin.className = "coin-animate";
//   coin.style.left = `${startX}px`;
//   coin.style.top = `${startY}px`;
//   coin.style.transform = "translate(0, 0)";

//   tableEl.appendChild(coin); // <== append to #table not body

//   requestAnimationFrame(() => {
//     coin.style.transform = `translate(${dx}px, ${dy}px)`;
//   });

//   setTimeout(() => coin.remove(), 800);
// }

function renderCardsNearPlayers(players) {
  const table = document.getElementById("table");
  const { width: tableWidth, height: tableHeight } =
    table.getBoundingClientRect();

  // Remove existing cards before drawing new ones
  document.querySelectorAll(".card").forEach((card) => card.remove());

  players.forEach((player) => {
    if (player.hasFolded) return;
    const cards = player.hand || [];
    const angle = player.position.angle;
    const baseX = player.position.x;
    const baseY = player.position.y;

    const spread = tableWidth * 0.04; // e.g., 4% of table width
    const baseOffset = tableWidth * 0.12; // e.g., 12% away from player
    const cardWidth = tableWidth * 0.1; // e.g., 8% of table width
    const cardHeight = cardWidth * 1.5;

    const cardCount = cards.length;

    cards.forEach((card, idx) => {
      const cardDiv = document.createElement("div");
      cardDiv.className = "card";
      cardDiv.style.position = "absolute";

      const img = document.createElement("img");

      if (socket.id === player.id || finalWinner) {
        img.src = `../img/cards/card${card.suit}${card.rank}.png`;
        img.alt = `${card.rank}${card.suit}`;
      } else {
        img.src = `../img/cards/cardBack_blue2.png`;
      }

      img.style.width = `${cardWidth}px`;
      img.style.height = `${cardHeight}px`;
      cardDiv.appendChild(img);

      const indexOffset = idx - (cardCount - 1) / 2;

      // Calculate base position away from player
      const basePosX = baseX + baseOffset * Math.cos(angle);
      const basePosY = baseY + baseOffset * Math.sin(angle);

      // Calculate normal vector
      const normalX = Math.sin(angle);
      const normalY = -Math.cos(angle);

      // Final card position
      const x = basePosX + spread * indexOffset * normalX;
      const y = basePosY + spread * indexOffset * normalY;

      cardDiv.style.left = `${x}px`;
      cardDiv.style.top = `${y}px`;

      table.appendChild(cardDiv);
    });
  });
}

function renderRoundPot(game) {
  const gamePotDiv = document.createElement("div");
  gamePotDiv.className = "round-pot";

  const img = document.createElement("img");
  img.src = "./img/coin.png";
  img.alt = "Pot";

  const roundNumber = document.createElement("h3");
  roundNumber.textContent = `Round. ${game.round}`;

  const amountText = document.createElement("span");
  amountText.textContent = `Rs. ${game.totalBetAmount}`;
  gamePotDiv.appendChild(roundNumber);
  gamePotDiv.appendChild(img);
  gamePotDiv.appendChild(amountText);

  const table = document.getElementById("table");
  table.appendChild(gamePotDiv);
}

function renderRoundLogs(msg, currentPlayer = null, winner = null) {
  // Remove any existing log div
  const existingLog = document.getElementById("round-log");
  if (existingLog) {
    existingLog.remove();
  }

  const logDiv = document.createElement("div");
  logDiv.id = "round-log";

  const p = document.createElement("p");
  p.textContent = msg;
  speak(msg);
  logDiv.appendChild(p);

  const turnSpan = document.createElement("span");

  // If it's a player's turn, show that
  if (currentPlayer) {
    turnSpan.textContent = `Turn To Bet: ${currentPlayer}`;
  }
  if (winner) {
    console.log("Winner is " + winner.name);
    turnSpan.textContent = `Winner: ${winner.name}`;
  }
  logDiv.appendChild(turnSpan);
  table.appendChild(logDiv);
}

export function startSocketConfiguration(username, balance) {
  socket = io();
  socket.on("connect", () => {
    console.log(username);
    console.log("User Connected with socket id: " + socket.id);
    socket.emit("set username", username);
  });
  socket.once("roomNotFound", () => {
    alert("Room not found.");
    gameInitial.style.display = "flex";
    splashScreen.style.display = "flex";
  });

  socket.once("gameAlreadyStarted", ({ message }) => {
    alert(message);
    gameInitial.style.display = "flex";
    splashScreen.style.display = "flex";
  });
  socket.on("readyForRound", () => {
    console.log("Ready to start the round!");
    speak(`Ready to start the round!`);
    gameInitial.style.display = "none";
    gameMain.style.display = "flex";
    gameStarted = true;
    finalWinner = false;
    backgroundSound.volume = 0.2;
    backgroundSound.currentTime = 0; // rewind to start
    backgroundSound.play();
  });
  socket.on("gameStateUpdated", (updatedGame) => {
    console.log("Game state updated:", updatedGame);
    if (gameStarted && updatedGame.players) {
      const rotatedPlayers = rotatePlayers(updatedGame.players, username);
      lastRotatedPlayers = rotatedPlayers;
      renderPlayersOnTable(rotatedPlayers, updatedGame, socket.id);
      renderCardsNearPlayers(rotatedPlayers);
      renderRoundPot(updatedGame);
    }
    socket.on("betPlaced", ({ message, currentPlayer }) => {
      renderRoundLogs(message, currentPlayer);

      // const bettingPlayer = lastRotatedPlayers.find(
      //   (p) => p.name === currentPlayer
      // );
      // if (bettingPlayer) {
      //   animateCoinFromPlayerToPot(bettingPlayer.id);
      // }
    });
    socket.on("betSoundEffect", () => {
      betPlaceSound.currentTime = 0; // rewind to start
      betPlaceSound.play();
    });
  });
  socket.on("showCardMessage", ({ message, winner }) => {
    if (winner && !finalWinner) {
      finalWinner = true;
      socket.emit("requestRestartGame");
    }
    renderRoundLogs(message, null, winner);
    // Re-render cards so they show the front side
    if (gameStarted) {
      renderCardsNearPlayers(lastRotatedPlayers);
    }
  });

  createRoomBtn.addEventListener("click", () => {
    clickSound.currentTime = 0; // rewind to start
    clickSound.play();
    createRoom(username, balance);
  });
  joinRoomBtn.addEventListener("click", () => {
    clickSound.currentTime = 0; // rewind to start
    clickSound.play();
    joinRoomUI(username, balance);
  });
  placeBetBtn.addEventListener("click", () => {
    const selected = document.querySelector('input[name="bet-amount"]:checked');
    const betAmount = parseInt(selected.value);
    console.log(betAmount);
    socket.emit("placeBet", socket.id, Number(betAmount));
  });
  showCardsBtn.addEventListener("click", () => {
    socket.emit("showCards", socket.id);
  });
  packCardsBtn.addEventListener("click", () => {
    socket.emit("packCards", socket.id);
  });
}

// Create Room

function createRoom(name, balance) {
  if (socket) {
    console.log(name);
    socket.emit("create room");
    socket.once("room created", (newRoomId) => {
      currentRoomId = newRoomId;
      socket.emit("joinRoom", newRoomId);
      socket.emit("addPlayers", { name, balance: balance, newRoomId });

      renderInitialGameScreen(newRoomId);
    });
    isRoomCreator = true;
  }
}

// Join Room

function joinRoomUI(username, balance) {
  lobbySelectionScreen.style.display = "none";
  joinRoomScreen.style.display = "flex";

  btnJoinRoom.addEventListener("click", () => {
    const roomId = roomIdInputEl.value.trim();

    joinToExistingRoom(roomId, username, balance);
  });
}

console.log("GameStarted: " + gameStarted);

function joinToExistingRoom(newRoomId, name, balance) {
  socket.emit("joinRoom", newRoomId);
  socket.emit("addPlayers", { name, balance: balance, newRoomId });

  renderInitialGameScreen(newRoomId);
}
function renderInitialGameScreen(roomId) {
  let totalPlayersConnected;
  lobbySelectionScreen.style.display = "none";
  joinRoomScreen.style.display = "none";
  console.log("renderInitialGameScreen");
  socket.on("totalPlayers", (playersData) => {
    totalPlayersConnected = playersData.length;
    roomIdEl.textContent = roomId;
    totalPlayersEl.textContent = totalPlayersConnected;

    const playerListEl = document.getElementById("playerList");
    playerListEl.innerHTML = "";

    playersData.forEach((player) => {
      const li = document.createElement("li");
      li.textContent = player.name || "Unnamed Player";
      playerListEl.appendChild(li);
    });
    console.log(roomIdEl);
    console.log(totalPlayersEl);
    mainGameScreen.style.display = "flex";

    console.log(totalPlayersConnected);
    if (isRoomCreator && totalPlayersConnected >= 2) {
      startGameBtn.style.display = "inline-block";
    } else {
      startGameBtn.style.display = "none";
    }
  });
}

export function renderMainGameScreen() {
  console.log(currentRoomId);
  console.log("Render main game screen");

  socket.emit("startGame", currentRoomId);
}

// socket.emit("addPlayers", { name, balance });

// // When connected to the server

// socket.on("totalPlayers", (playersData) => {
//   userInfoSection.innerHTML = "";
//   userInfoSection.innerHTML = `<span> You have connected to game. <br> Players Connected : ${
//     playersData.length
//   } <br> Remaining Players: ${3 - playersData.length} </span>`;
// });
// socket.on("gameStateUpdated", (updatedGame) => {
//   console.log("Game state updated:", updatedGame);

//   renderUI(updatedGame);
// });

// socket.on("roomFull", () => {
//   alert("Room is already full. You cannot join.");
// });

// socket.on("readyForRound", () => {
//   console.log("Ready to start the round!");
//   userInfoSection.style.display = "none";
//   gameWinnerSection.textContent = "";
//   gameOptionsSection.style.display = "block";
//   log.innerHTML = "";

//   // socket.emit("startRound");
// });
// socket.on("currentBetTurn", (currentPlayer) => {
//   const p = document.createElement("p");

//   p.textContent = `Game has started. Turn to Bet : ${currentPlayer.name}`;
//   log.appendChild(p);
// });
// socket.on("notEnoughPlayers", () => {
//   alert("At least 2 players are required to start the round.");
// });

// showCardsBtn.addEventListener("click", () => {
//   socket.emit("showCards", socket.id);
// });
// packCardsBtn.addEventListener("click", () => {
//   socket.emit("packCards", socket.id);
// });
// socket.on("betPlaced", ({ message, currentPlayer }) => {
//   displayMessage(message, currentPlayer);
// });
// socket.on("showCardMessage", ({ message, winner }) => {
//   displayMessage(message, null, winner);
// });
// socket.on("playerDisconnect", () => {
//   displayMessage("Restarting due to player disconnection");
// });
// //Display PlaceBet Message
// function displayMessage(msg, currentPlayer = null, winner = null) {
//   const p = document.createElement("p");
//   p.textContent = msg;
//   log.appendChild(p);

//   // If it's a regular turn update
//   if (currentPlayer) {
//     const span = document.createElement("span");
//     span.textContent = `Turn To Bet : ${currentPlayer}`;
//     log.appendChild(span);
//   }

//   // If there's a winner, display winner info
// if (winner) {
//   const winnerDiv = document.createElement("div");
//   winnerDiv.innerHTML = `
//   <strong> Winner:</strong> ${winner.name}<br>
//   <strong>Winning Hand:</strong> ${winner.hand
//     .map((card) => `${card.rank} ${card.suit}`)
//     .join(", ")}
// `;

//   gameWinnerSection.appendChild(winnerDiv);

//   gameOptionsSection.style.display = "none";
//   socket.emit("restartGame");
// }
// }

// // Render UI
// function renderUI(updatedGame) {
//   const currentPlayer = updatedGame.players.find(
//     (player) => player.id === socket.id
//   );
//   console.log(currentPlayer);
//   if (currentPlayer) {
//     userCardSection.innerHTML = `
//     <div class="card">
//       <h2>${currentPlayer.name}</h2>
//       <p>Balance: ${currentPlayer.balance}</p>
//     <div>
//             ${currentPlayer.hand
//               .map((card) => `${card.rank} ${card.suit}`)
//               .join("<br>")}
//     </div>
//     </div>
//   `;
//   }
// }
