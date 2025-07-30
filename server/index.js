import express from "express";
import http from "http";
import { Server } from "socket.io";
import authRoutes from "./routes/authRoutes.js";
import { Game } from "./models/Game.js";
import { v4 as uuidv4 } from "uuid";
import { incrementGamesPlayed, updateUserBalance } from "./config/userModel.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static("../client/public"));
app.use(express.json());
app.use("/api/auth", authRoutes);
const rooms = {};
const users = new Map();
let restartScheduled = false;
io.on("connect", (socket) => {
  console.log("A user connected: " + socket.id);

  socket.on("set username", (username) => {
    users.set(socket.id, username);
    console.log(`Username set for ${socket.id}: ${username}`);
  });

  socket.on("create room", () => {
    const roomID = uuidv4();

    rooms[roomID] = new Game();

    socket.join(roomID);
    socket.data.room = roomID;

    const name = users.get(socket.id);
    console.log(`${name} created and joined room: ${roomID}`);

    socket.emit("room created", roomID);
  });

  // socket.on("disconnect", () => {
  //   console.log(`User disconnected: ${socket.id}`);
  //   removePlayerFromList(game.players, socket.id);
  //   console.log(game.players);
  //   io.to(roomName).emit("gameStateUpdated", game);
  // });

  socket.on("joinRoom", (roomName) => {
    console.log(`${socket.id} is attempting to join room: ${roomName}`);

    if (!rooms[roomName]) {
      console.log("Room does not exist");
      socket.emit("roomNotFound");
      return;
    }
    const game = rooms[roomName];

    if (game.gameStarted) {
      console.log("Cannot join. Game already started.");
      socket.emit("gameAlreadyStarted", {
        message:
          "You cannot join this room because the game has already started.",
      });
      return;
    }
    const playersData = game.players;
    socket.join(roomName);
    socket.data.room = roomName;

    socket.on("addPlayers", (newPlayerData) => {
      const { name, balance, newRoomId } = newPlayerData;

      if (!name || balance === undefined) {
        console.log("Invalid player information");
        return;
      }
      const alreadyExists = game.players.some(
        (player) => player.id === socket.id
      );
      if (alreadyExists) {
        console.log(`Player with ID ${socket.id} already exists.`);
        return;
      }
      const newPlayer = {
        id: socket.id,
        name,
        balance,
      };

      game.addPlayers(newPlayer);
      console.log("Players added:");
      console.log(playersData);

      console.log("New Room Id: ", newRoomId);

      io.to(newRoomId).emit("totalPlayers", game.players);
      io.to(newRoomId).emit("gameStateUpdated", game);
    });

    socket.on("startGame", (roomId) => {
      game.startGame();
      io.to(roomId).emit("readyForRound");
      setTimeout(() => {
        io.to(roomId).emit("gameStateUpdated", game);
        io.to(roomId).emit("currentBetTurn", game.getCurrentPlayer());
      }, 100);
    });

    socket.on("placeBet", async (id, betAmount) => {
      const player = game.players.find((player) => player.id === id);
      if (!player) return;

      const result = game.placeBet(player, betAmount);
      const currentBetTurn = game.getCurrentPlayer();
      socket.emit("betPlaced", {
        message: result.message,
        playerId: player.id,
        currentPlayer: currentBetTurn.name,
      });

      if (result.success) {
        io.to(roomName).emit("betSoundEffect");
        io.to(roomName).emit("gameStateUpdated", game);
        io.to(roomName).emit("betPlaced", {
          message: `${player.name} bets Rs ${betAmount} .`,
          playerId: player.id,
          currentPlayer: currentBetTurn.name,
        });
        try {
          await updateUserBalance(player.name, player.balance);
        } catch (error) {
          console.error("Error updating user balance:", error);
        }
      }
    });

    socket.on("showCards", async (id) => {
      const player = game.players.find((player) => player.id === id);

      if (!player) return;
      const result = game.showCards(player);

      if (result.success) {
        io.to(roomName).emit("gameStateUpdated", game);
        io.to(roomName).emit("showCardMessage", {
          message: result.message,
          winner: result.winner,
        });

        try {
          await updateUserBalance(player.name, player.balance);
        } catch (error) {
          console.error("Error updating user balance:", error);
        }
      } else {
        socket.emit("showCardMessage", {
          message: result.message,
        });
      }
    });

    socket.on("packCards", async (id) => {
      const player = game.players.find((player) => player.id === id);
      if (!player) return;

      const result = game.foldPlayer(player);
      if (result.success) {
        try {
          await updateUserBalance(player.name, player.balance);
        } catch (error) {
          console.error("Error updating user balance:", error);
        }
      }
      if (result.winner && result.success) {
        io.to(roomName).emit("gameStateUpdated", game);
        io.to(roomName).emit("showCardMessage", {
          message: result.message,
          winner: result.winner,
        });
      } else if (result.success) {
        io.to(roomName).emit("gameStateUpdated", game);

        io.to(roomName).emit("betPlaced", {
          message: result.message,
          playerId: player.id,
          currentPlayer: game.getCurrentPlayer()?.name || null,
        });
      } else {
        socket.emit("betPlaced", {
          message: result.message,
          playerId: player.id,
          currentPlayer: game.getCurrentPlayer()?.name || null,
        });
      }
    });

    socket.on("requestRestartGame", async () => {
      if (restartScheduled) return;

      restartScheduled = true;
      setTimeout(async () => {
        game.restartGame();
        io.to(roomName).emit("readyForRound");
        io.to(roomName).emit("gameStateUpdated", game);
        io.to(roomName).emit("currentBetTurn", game.getCurrentPlayer());
        try {
          for (const player of game.players) {
            await incrementGamesPlayed(player.name);
          }
        } catch (error) {
          console.error("Error incrementing games played:", error);
        }
        restartScheduled = false;
      }, 5000);
    });
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);

      const player = game.players.find((player) => player.id === socket.id);
      if (!player) return;

      const result = game.foldPlayer(player);

      if (result.winner && result.success) {
        io.to(roomName).emit("gameStateUpdated", game);
        io.to(roomName).emit("showCardMessage", {
          message: result.message,
          winner: result.winner,
        });
      } else if (result.success) {
        io.to(roomName).emit("gameStateUpdated", game);
        io.to(roomName).emit("betPlaced", {
          message: result.message,
          playerId: player.id,
          currentPlayer: game.getCurrentPlayer()?.name || null,
        });
      } else {
        socket.emit("betPlaced", {
          message: result.message,
          playerId: player.id,
          currentPlayer: game.getCurrentPlayer()?.name || null,
        });
      }
      removePlayerFromList(game.players, socket.id);
    });
  });

  function removePlayerFromList(list, socketId) {
    const index = list.findIndex((p) => p.id === socketId);
    if (index !== -1) {
      const [removed] = list.splice(index, 1);
      console.log(`Removed from list: ${removed.name}`);
    }
  }
});
server.listen(3000, () => {
  console.log("Server is running on port 3000");
});
