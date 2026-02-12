const express = require('express');
const mqtt = require('mqtt');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

const PORT = 8255;
const TEAM_ID = "Mavics";
const MQTT_BROKER = "mqtt://157.173.101.159:1883";
const MONGO_URI = process.env.MONGODB_URI;

// MongoDB Connection
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✓ Connected to MongoDB');
    console.log('Database: swipetopay');
  })
  .catch(err => {
    console.error('✗ MongoDB connection error:', err.message);
    console.error('Please check your MONGODB_URI in .env file');
  });

// Handle MongoDB connection events
mongoose.connection.on('connected', () => {
  console.log('MongoDB connection established');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

// Card Schema
const cardSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  holderName: { type: String, required: true },
  balance: { type: Number, default: 0 },
  lastTopup: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Card = mongoose.model('Card', cardSchema);

// Transaction Schema
const transactionSchema = new mongoose.Schema({
  uid: { type: String, required: true, index: true },
  holderName: { type: String, required: true },
  type: { type: String, enum: ['topup', 'debit'], default: 'topup' },
  amount: { type: Number, required: true },
  balanceBefore: { type: Number, required: true },
  balanceAfter: { type: Number, required: true },
  description: { type: String },
  timestamp: { type: Date, default: Date.now }
});

const Transaction = mongoose.model('Transaction', transactionSchema);

// Topics
const TOPIC_STATUS = `rfid/${TEAM_ID}/card/status`;
const TOPIC_BALANCE = `rfid/${TEAM_ID}/card/balance`;
const TOPIC_TOPUP = `rfid/${TEAM_ID}/card/topup`;

// MQTT Client Setup
const mqttClient = mqtt.connect(MQTT_BROKER);

mqttClient.on('connect', () => {
  console.log('Connected to MQTT Broker');
  mqttClient.subscribe(TOPIC_STATUS);
  mqttClient.subscribe(TOPIC_BALANCE);
});

mqttClient.on('message', (topic, message) => {
  console.log(`Received message on ${topic}: ${message.toString()}`);
  try {
    const payload = JSON.parse(message.toString());

    if (topic === TOPIC_STATUS) {
      io.emit('card-status', payload);
    } else if (topic === TOPIC_BALANCE) {
      io.emit('card-balance', payload);
    }
  } catch (err) {
    console.error('Failed to parse MQTT message:', err);
  }
});

// HTTP Endpoints

// Health check endpoint
app.get('/health', (req, res) => {
  const health = {
    backend: 'online',
    mqtt: mqttClient.connected ? 'connected' : 'disconnected',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'error',
    timestamp: new Date().toISOString()
  };
  res.json(health);
});

app.post('/topup', async (req, res) => {
  const { uid, amount, holderName } = req.body;

  if (!uid || amount === undefined) {
    return res.status(400).json({ error: 'UID and amount are required' });
  }

  try {
    // Find or create card
    let card = await Card.findOne({ uid });
    const balanceBefore = card ? card.balance : 50.0; // Default initial balance is $50
    
    if (!card) {
      if (!holderName) {
        return res.status(400).json({ error: 'Holder name is required for new cards' });
      }
      card = new Card({ uid, holderName, balance: 50.0 + amount, lastTopup: Math.abs(amount) });
    } else {
      // Add or subtract from existing balance
      card.balance += amount;
      card.lastTopup = Math.abs(amount);
      card.updatedAt = Date.now();
    }

    await card.save();

    // Determine transaction type based on amount
    const transactionType = amount >= 0 ? 'topup' : 'debit';
    const absAmount = Math.abs(amount);
    const description = amount >= 0 
      ? `Top-up of $${absAmount.toFixed(2)}` 
      : `Withdrawal of $${absAmount.toFixed(2)}`;

    // Create transaction record
    const transaction = new Transaction({
      uid: card.uid,
      holderName: card.holderName,
      type: transactionType,
      amount: absAmount,
      balanceBefore: balanceBefore,
      balanceAfter: card.balance,
      description: description
    });
    await transaction.save();

    // Publish to MQTT with updated balance
    const payload = JSON.stringify({ uid, amount: card.balance });
    mqttClient.publish(TOPIC_TOPUP, payload, (err) => {
      if (err) {
        console.error('Failed to publish topup:', err);
        return res.status(500).json({ error: 'Failed to publish topup command' });
      }
      console.log(`Published ${transactionType} for ${uid} (${card.holderName}): ${card.balance}`);
    });

    res.json({ 
      success: true, 
      message: transactionType === 'topup' ? 'Top-up successful' : 'Withdrawal successful',
      card: {
        uid: card.uid,
        holderName: card.holderName,
        balance: card.balance,
        lastTopup: card.lastTopup
      },
      transaction: {
        id: transaction._id,
        amount: transaction.amount,
        balanceAfter: transaction.balanceAfter,
        timestamp: transaction.timestamp
      }
    });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Database operation failed' });
  }
});

// Get card details
app.get('/card/:uid', async (req, res) => {
  try {
    const card = await Card.findOne({ uid: req.params.uid });
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }
    res.json(card);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Database operation failed' });
  }
});

// Get all cards
app.get('/cards', async (req, res) => {
  try {
    const cards = await Card.find().sort({ updatedAt: -1 });
    res.json(cards);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Database operation failed' });
  }
});

// Get transaction history for a specific card
app.get('/transactions/:uid', async (req, res) => {
  try {
    const transactions = await Transaction.find({ uid: req.params.uid })
      .sort({ timestamp: -1 })
      .limit(50); // Limit to last 50 transactions
    res.json(transactions);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Database operation failed' });
  }
});

// Get all transactions (optional - for admin view)
app.get('/transactions', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const transactions = await Transaction.find()
      .sort({ timestamp: -1 })
      .limit(limit);
    res.json(transactions);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Database operation failed' });
  }
});

// Socket connectivity
io.on('connection', (socket) => {
  console.log('A user connected to the dashboard');
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on http://0.0.0.0:${PORT}`);
  console.log(`Access from: http://157.173.101.159:${PORT}`);
});
