const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const MONGO_HOST = process.env.MONGO_HOST || 'mongo';
const MONGO_PORT = process.env.MONGO_PORT || '27017';
mongoose.connect(`mongodb://${MONGO_HOST}:${MONGO_PORT}/healthcare`);

const User = mongoose.model("User", {
  username: String,
  email: String,
  password: String
});

const SECRET = "secret123";

// Register
app.post('/register', async (req, res) => {
  const hashed = await bcrypt.hash(req.body.password, 10);
  await User.create({
    username: req.body.username,
    email: req.body.email,
    password: hashed
  });
  res.json({ message: "Registered" });
});

// Login
app.post('/login', async (req, res) => {
  const user = await User.findOne({ username: req.body.username });

  if (!user) return res.status(400).send("User not found");

  const valid = await bcrypt.compare(req.body.password, user.password);
  if (!valid) return res.status(400).send("Invalid password");

  const token = jwt.sign({ id: user._id, email: user.email, username: user.username }, SECRET);
  res.json({ token, user: { id: user._id, username: user.username, email: user.email } });
});

app.get('/', (req, res) => res.send("Auth Service Running"));

app.listen(5000, () => console.log("Auth running"));