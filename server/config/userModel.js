import bcrypt from "bcryptjs";
import pool from "./db.js";

export async function addUser(username, password) {
  const [rows] = await pool.query("Select id From users where username = ?", [
    username,
  ]);
  if (rows.length > 0) throw new Error("User already exists");

  const passwordHash = await bcrypt.hash(password, 10);

  await pool.query(
    "INSERT INTO users (username, password_hash, total_balance, total_games_played) VALUES (?, ?, 1000, 0)",
    [username, passwordHash]
  );
}

export async function verifyUser(username, password) {
  const [rows] = await pool.query(
    "SELECT password_hash FROM users WHERE username = ?",
    [username]
  );
  if (rows.length === 0) return false;
  const passwordHash = rows[0].password_hash;
  const isValid = await bcrypt.compare(password, passwordHash);
  return isValid;
}
export async function getUserStats(username) {
  const [rows] = await pool.query(
    "SELECT total_balance, total_games_played FROM users WHERE username = ?",
    [username]
  );
  if (rows.length === 0) return null;
  return rows[0];
}

export async function updateUserBalance(username, newBalance) {
  await pool.query("UPDATE users SET total_balance = ? WHERE username = ?", [
    newBalance,
    username,
  ]);
}

export async function incrementGamesPlayed(username) {
  await pool.query(
    "UPDATE users SET total_games_played = total_games_played + 1 WHERE username = ?",
    [username]
  );
}
