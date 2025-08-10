const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Change to your frontend URL later
  }
});

const PORT = process.env.PORT || 5000;
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

app.use(cors());
app.use(express.json());

app.get('/api/messages', async (req, res) => {
  try {
    await client.connect();
    const collection = client.db('whatsapp').collection('processed_messages');
    const messages = await collection.find({}).toArray();
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching messages');
  }
});

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.on('sendMessage', async (msg) => {
    try {
      const newMessage = {
        message_id: `local_${Date.now()}`,
        wa_id: msg.wa_id,
        name: msg.name,
        text: msg.text,
        timestamp: new Date(),
        direction: "outgoing",
        status: "sent",
      };

      await client.connect();
      const collection = client.db('whatsapp').collection('processed_messages');
      await collection.insertOne(newMessage);

      io.emit('newMessage', newMessage);
    } catch (error) {
      console.error("Error saving message:", error);
    }
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
