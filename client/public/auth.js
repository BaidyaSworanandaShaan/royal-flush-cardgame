import {
  clickSound,
  lobbySelectionScreen,
  loginBtn,
  signupBtn,
} from "./domSelectors.js";
import { fetchUserStats, startSocketConfiguration } from "./gameService.js";

signupBtn.addEventListener("click", async () => {
  clickSound.currentTime = 0; // rewind to start
  clickSound.play();
  const username = document.getElementById("signup-username").value.trim();
  const password = document.getElementById("signup-password").value.trim();

  console.log(username, password);
  const res = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (res.ok) {
    alert("Signup successful. Please log in.");
  } else {
    alert("Signup failed: " + data.message);
  }
});

loginBtn.addEventListener("click", async () => {
  clickSound.currentTime = 0; // rewind to start
  clickSound.play();
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value.trim();

  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();

  if (res.ok) {
    alert("Login successful!");

    sessionStorage.setItem("username", username);

    document.querySelector(".auth-screen").style.display = "none";
    lobbySelectionScreen.style.display = "flex";

    fetchUserStats(username).then((stats) => {
      if (stats) {
        const balance = stats.total_balance;
        startSocketConfiguration(username, balance);
      } else {
        alert("Could not fetch user stats");
      }
    });
  } else {
    alert("Login failed: " + data.message);
  }
});
