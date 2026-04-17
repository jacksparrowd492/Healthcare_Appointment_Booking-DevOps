const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Environment variables for DevOps flexibility
const MONGO_HOST = process.env.MONGO_HOST || 'mongo';
const MONGO_PORT = process.env.MONGO_PORT || '27017';
const MONGO_USER = process.env.MONGO_USER || '';
const MONGO_PASS = process.env.MONGO_PASS || '';
const MONGO_DB = process.env.MONGO_DB || 'healthcare';

// Build connection string with or without credentials
let mongoURI = `mongodb://${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}`;
if (MONGO_USER && MONGO_PASS) {
    mongoURI = `mongodb://${MONGO_USER}:${MONGO_PASS}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}?authSource=admin`;
}

mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log(`Auth Service connected to MongoDB at ${MONGO_HOST}`))
  .catch(err => console.error('MongoDB connection error:', err));

const User = mongoose.model("User", {
  username: String,
  email: String,
  password: String
});

const SECRET = process.env.JWT_SECRET || "secret123";

// Register
app.post('/register', async (req, res) => {
  try {
    const hashed = await bcrypt.hash(req.body.password, 10);
    const newUser = await User.create({
      username: req.body.username,
      email: req.body.email,
      password: hashed
    });
    res.status(201).json({ message: "Registered", userId: newUser._id });
  } catch (err) {
    res.status(500).json({ error: "Registration failed" });
  }
});

// Login
app.post('/login', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.body.username });
    if (!user) return res.status(400).send("User not found");

    const valid = await bcrypt.compare(req.body.password, user.password);
    if (!valid) return res.status(400).send("Invalid password");

    const token = jwt.sign(
        { id: user._id, email: user.email, username: user.username }, 
        SECRET,
        { expiresIn: '24h' }
    );
    res.json({ token, user: { id: user._id, username: user.username, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: "Login error" });
  }
});

app.get('/', (req, res) => res.send("Auth Service Running"));

app.listen(5000, '0.0.0.0', () => console.log("Auth running on port 5000"));