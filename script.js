const socket = io("https://draw-guess-backend-tzur.onrender.com");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let drawing = false;
let strokes = [];
let playerName = "";
let gameId = "";
let isDrawer = false;
let currentWord = "";
let color = "#222222";

// 🎨 UI Elements
const colorPicker = document.getElementById("colorPicker");
colorPicker.addEventListener("input", (e) => (color = e.target.value));

const draw = (e) => {
  if (!drawing) return;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.strokeStyle = color;
  ctx.lineTo(e.offsetX, e.offsetY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(e.offsetX, e.offsetY);
  socket.emit("draw", { x: e.offsetX, y: e.offsetY, color });
};

canvas.addEventListener("mousedown", (e) => {
  if (!isDrawer) return;
  drawing = true;
  draw(e);
});

canvas.addEventListener("mouseup", () => {
  drawing = false;
  ctx.beginPath();
});

canvas.addEventListener("mousemove", draw);

// ✋ Touch events for mobile drawing
canvas.addEventListener("touchstart", (e) => {
  if (!isDrawer) return;
  e.preventDefault();
  drawing = true;
});

canvas.addEventListener("touchmove", (e) => {
  if (!drawing) return;
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches[0];
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.strokeStyle = color;
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
  socket.emit("draw", { x, y, color });
});

canvas.addEventListener("touchend", () => {
  drawing = false;
  ctx.beginPath();
});

// 🧹 Clear canvas
document.getElementById("clearBtn").addEventListener("click", () => {
  if (!isDrawer) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  socket.emit("clear");
});

// ✨ Lobby & Game Controls
document.getElementById("createBtn").addEventListener("click", () => {
  playerName = document.getElementById("playerName").value.trim();
  if (!playerName) return alert("Enter your name first!");
  socket.emit("createGame", playerName);
});

document.getElementById("joinBtn").addEventListener("click", () => {
  playerName = document.getElementById("playerName").value.trim();
  gameId = document.getElementById("gameIdInput").value.trim();
  if (!playerName || !gameId) return alert("Enter both name and Game ID!");
  socket.emit("joinGame", { gameId, playerName });
});

// 💬 Chat System
document.getElementById("sendBtn").addEventListener("click", () => {
  const msg = document.getElementById("chat-input").value.trim();
  if (msg) {
    socket.emit("chatMessage", { gameId, playerName, msg });
    document.getElementById("chat-input").value = "";
  }
});

socket.on("chatMessage", (data) => {
  const chatBox = document.getElementById("chat-messages");
  const p = document.createElement("p");
  p.innerHTML = `<strong>${data.playerName}:</strong> ${data.msg}`;
  chatBox.appendChild(p);
  chatBox.scrollTop = chatBox.scrollHeight;
});

// 🎮 Game Events
socket.on("gameCreated", (data) => {
  gameId = data.gameId;
  document.getElementById("gameIdDisplay").innerText = gameId;
  document.getElementById("lobby").classList.add("hidden");
  document.getElementById("gameUI").classList.remove("hidden");
});

socket.on("gameJoined", (data) => {
  gameId = data.gameId;
  document.getElementById("gameIdDisplay").innerText = gameId;
  document.getElementById("lobby").classList.add("hidden");
  document.getElementById("gameUI").classList.remove("hidden");
});

// ✏️ Drawing updates from server
socket.on("draw", (data) => {
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.strokeStyle = data.color || "#222";
  ctx.lineTo(data.x, data.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(data.x, data.y);
});

socket.on("clear", () => ctx.clearRect(0, 0, canvas.width, canvas.height));

// 🏆 Score updates
socket.on("updateScores", (scores) => {
  const list = document.getElementById("score-list");
  list.innerHTML = "";
  for (const [name, score] of Object.entries(scores)) {
    const li = document.createElement("li");
    li.textContent = `${name}: ${score}`;
    list.appendChild(li);
  }
});

// 🔁 Turn Management
socket.on("turnChange", (data) => {
  const { drawer, wordHint, isYouDrawing } = data;
  isDrawer = isYouDrawing;
  document.getElementById("drawerName").innerText = drawer;
  document.getElementById("wordHint").innerText = isDrawer
    ? `Your word: ${wordHint}`
    : `Hint: ${wordHint}`;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});
