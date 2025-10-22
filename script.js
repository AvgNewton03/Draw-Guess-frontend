const socket = io("https://draw-guess-backend-tzur.onrender.com");

const menu = document.getElementById("menu");
const game = document.getElementById("game");
const createBtn = document.getElementById("createGame");
const joinBtn = document.getElementById("joinGame");
const usernameInput = document.getElementById("username");
const joinInput = document.getElementById("joinGameId");
const status = document.getElementById("status");

const gameInfo = document.getElementById("gameInfo");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const colorPicker = document.getElementById("colorPicker");
const clearCanvas = document.getElementById("clearCanvas");
const colorTools = document.getElementById("colorTools");

const messages = document.getElementById("messages");
const msgInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendMessage");

let drawing = false;
let isDrawer = false;
let currentColor = "#000000";
let gameId = "";
let username = "";
let currentWord = "";
let scores = {};
let guessedThisRound = false;

ctx.lineWidth = 3;
ctx.lineCap = "round";

const WORDS = [
  "Star",
  "House",
  "Bridge",
  "Car",
  "Bicycle",
  "Computer",
  "Guitar",
  "Mountain",
  "River",
  "Tree",
  "Clock",
  "Key",
  "Book",
  "Sun",
  "Moon",
];

// --- Game Creation / Joining ---
createBtn.onclick = () => {
  username = usernameInput.value.trim();
  if (!username) return alert("Enter your name!");
  socket.emit("createGame", { username });
};

joinBtn.onclick = () => {
  username = usernameInput.value.trim();
  const id = joinInput.value.trim();
  if (!username || !id) return alert("Enter all fields!");
  socket.emit("joinGame", { gameId: id, username });
};

// --- Socket Events ---
socket.on("gameCreated", (data) => {
  gameId = data.gameId;
  isDrawer = true;
  scores[username] = 0;
  startGameUI(`Game created! Share ID: ${gameId}`);
  startNewRound();
});

socket.on("gameJoined", (data) => {
  gameId = data.gameId;
  isDrawer = false;
  scores = data.scores || {};
  scores[username] = 0;
  startGameUI(`Joined game ${gameId}`);
});

socket.on("draw", (data) => {
  if (isDrawer) return;
  ctx.lineTo(data.x, data.y);
  ctx.strokeStyle = data.color;
  ctx.stroke();
});

socket.on("clear", () => ctx.clearRect(0, 0, canvas.width, canvas.height));

socket.on("chatMessage", (data) => {
  const div = document.createElement("div");
  div.textContent = `${data.username}: ${data.msg}`;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
});

socket.on("correctGuess", (data) => {
  const div = document.createElement("div");
  div.textContent = `✅ ${data.username} guessed the word!`;
  div.style.fontWeight = "bold";
  messages.appendChild(div);
  scores[data.username] = (scores[data.username] || 0) + 10;
  if (isDrawer) scores[username] += 5;
  updateScores();
  guessedThisRound = true;
  setTimeout(() => startNewRound(), 3000);
});

socket.on("newRound", (data) => {
  currentWord = data.word;
  guessedThisRound = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (isDrawer) {
    colorTools.classList.remove("hidden");
    alert(`You are drawing: ${currentWord}`);
  } else {
    colorTools.classList.add("hidden");
  }
});

// --- Drawing ---
canvas.addEventListener("touchstart", (e) => startDraw(e.touches[0]));
canvas.addEventListener("touchmove", (e) => draw(e.touches[0]));
canvas.addEventListener("touchend", () => (drawing = false));

canvas.addEventListener("mousedown", (e) => startDraw(e));
canvas.addEventListener("mousemove", (e) => draw(e));
canvas.addEventListener("mouseup", () => (drawing = false));

function startDraw(e) {
  if (!isDrawer) return;
  drawing = true;
  ctx.beginPath();
  ctx.moveTo(e.clientX - canvas.offsetLeft, e.clientY - canvas.offsetTop);
}

function draw(e) {
  if (!drawing || !isDrawer) return;
  const x = e.clientX - canvas.offsetLeft;
  const y = e.clientY - canvas.offsetTop;
  ctx.lineTo(x, y);
  ctx.strokeStyle = currentColor;
  ctx.stroke();
  socket.emit("draw", { gameId, x, y, color: currentColor });
}

colorPicker.oninput = (e) => (currentColor = e.target.value);

clearCanvas.onclick = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  socket.emit("clear", gameId);
};

// --- Chat & Guessing ---
sendBtn.onclick = () => {
  const msg = msgInput.value.trim();
  if (!msg) return;
  if (
    !isDrawer &&
    !guessedThisRound &&
    msg.toLowerCase() === currentWord.toLowerCase()
  ) {
    socket.emit("correctGuess", { gameId, username });
    msgInput.value = "";
    return;
  }
  socket.emit("chatMessage", { gameId, username, msg });
  msgInput.value = "";
};

// --- UI Helpers ---
function startGameUI(info) {
  menu.classList.add("hidden");
  game.classList.remove("hidden");
  gameInfo.textContent = info;
  if (isDrawer) colorTools.classList.remove("hidden");
  else colorTools.classList.add("hidden");
  updateScores();
}

function updateScores() {
  gameInfo.textContent =
    `Game ID: ${gameId} | Scores: ` +
    Object.entries(scores)
      .map(([u, s]) => `${u}: ${s}`)
      .join(", ");
}

// --- New Round ---
function startNewRound() {
  currentWord = WORDS[Math.floor(Math.random() * WORDS.length)];
  socket.emit("newRound", { gameId, word: currentWord });
}
