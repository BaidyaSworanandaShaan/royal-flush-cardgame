import express from "express";
import { addUser, getUserStats, verifyUser } from "../config/userModel.js";

const router = express.Router();

router.post("/signup", async (req, res) => {
  const { username, password } = req.body;
  try {
    await addUser(username, password);
    res.status(201).json({ message: "User created" });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message || "Unknown error" });
  }
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const valid = await verifyUser(username, password);
    if (!valid) return res.status(401).json({ message: "Invalid credentials" });

    res.json({ message: "Login successful" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/getUserStats", async (req, res) => {
  try {
    const username = req.query.username;
    if (!username) {
      return res.status(400).json({ message: "Username is required" });
    }

    const stats = await getUserStats(username);

    if (!stats) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(stats);
  } catch (error) {
    console.error("Error fetching user stats:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
