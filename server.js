const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const bcrypt = require("bcrypt");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:1234", // Adjust based on your React app's URL
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());
// Store messages in memory (for simplicity)
let messages = {};
let users = {}; // In-memory store for user data

// User registration
app.post("/signup", async (req, res) => {
  const { name, username, password } = req.body;

  if (users[username]) {
    return res.status(400).json({ message: "User already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  users[username] = { password: hashedPassword };

  return res.status(201).json({ message: "User registered successfully" });
});

// User login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = users[username];

  if (!user || !(await bcrypt.compare(password, user.password))) {
    console.log("credential mismatch");
    return res.status(401).json({ message: "Invalid credentials" });
  }

  return res.status(200).json({ message: "Login successful" });
});

io.on("connection", (socket) => {
  console.log("A user connected");

  // Join a room
  socket.on("joinRoom", (room) => {
    socket.join(room);
    // Send previous messages if any
    if (messages[room]) {
      socket.emit("previousMessages", messages[room]);
    }
  });

  // Handle incoming messages
  socket.on("sendMessage", ({ room, message }) => {
    if (!messages[room]) messages[room] = [];
    messages[room].push(message); // Store message

    // Broadcast message to the room
    io.to(room).emit("receiveMessage", message);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
