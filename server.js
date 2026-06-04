const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// In-memory storage for messages
const rooms = {};

// Get messages for a room
app.get('/messages/:roomId', (req, res) => {
    const roomId = req.params.roomId;
    const messages = rooms[roomId] || [];
    res.json({ messages });
});

// Send a message to a room
app.post('/send', (req, res) => {
    const { roomId, message } = req.body;
    
    if (!roomId || !message) {
        return res.status(400).json({ error: 'Missing roomId or message' });
    }

    if (!rooms[roomId]) {
        rooms[roomId] = [];
    }

    rooms[roomId].push(message);
    res.json({ success: true });
});

// Health check
app.get('/', (req, res) => {
    res.json({ status: 'Chat server running' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Chat server running on port ${PORT}`);
});