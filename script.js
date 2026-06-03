// In-memory message storage
const rooms = {};
let currentUser = '';
let currentRoom = '';
let currentPassword = '';
let pollInterval = null;

window.addEventListener('load', () => {
    console.log('✅ Chat app loaded successfully');
});

function joinChat() {
    const username = document.getElementById('usernameInput').value.trim();
    const room = document.getElementById('roomInput').value.trim();
    const password = document.getElementById('passwordInput').value.trim();

    console.log('Join attempt - Username:', username, 'Room:', room, 'Password:', password);

    if (!username) {
        alert('❌ Please enter your name');
        return;
    }

    if (!room) {
        alert('❌ Please enter a room name');
        return;
    }

    if (!password) {
        alert('❌ Please enter a room password');
        return;
    }

    // Create room key
    currentUser = username;
    currentRoom = room;
    currentPassword = password;

    // Initialize room if needed
    const roomKey = getRoomKey(room, password);
    if (!rooms[roomKey]) {
        rooms[roomKey] = [];
        console.log('✅ Created new room:', roomKey);
    }

    // Switch UI
    document.getElementById('setupSection').style.display = 'none';
    document.getElementById('chatWindow').style.display = 'flex';
    document.getElementById('roomName').innerHTML = currentRoom;
    document.getElementById('userName').innerHTML = currentUser;

    // Clear messages display
    document.getElementById('messages').innerHTML = '';

    // Display any existing messages
    displayAllMessages();

    // Start polling
    startPolling();

    // Focus input
    setTimeout(() => {
        document.getElementById('messageInput').focus();
    }, 100);

    console.log('✅ Joined room:', roomKey);
}

function getRoomKey(room, password) {
    return `${room}|${password}`;
}

function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();

    if (!text) {
        console.log('⚠️ Empty message');
        return;
    }

    if (!currentRoom || !currentPassword) {
        alert('❌ Not in a room');
        return;
    }

    const roomKey = getRoomKey(currentRoom, currentPassword);
    
    const message = {
        id: Date.now(),
        user: currentUser,
        text: text,
        time: getTime()
    };

    // Add to room
    if (!rooms[roomKey]) {
        rooms[roomKey] = [];
    }
    rooms[roomKey].push(message);

    console.log('✅ Message sent:', text);
    console.log('📊 Room now has', rooms[roomKey].length, 'messages');

    // Clear input
    input.value = '';

    // Display message immediately
    addMessageToUI(message);

    // Broadcast to other tabs
    broadcastMessage(roomKey, message);
}

function addMessageToUI(message) {
    const container = document.getElementById('messages');
    const div = document.createElement('div');
    div.className = message.user === currentUser ? 'message own' : 'message other';
    div.id = 'msg-' + message.id;

    div.innerHTML = `
        <div class="message-author">${escapeHtml(message.user)}</div>
        <div class="message-bubble">${escapeHtml(message.text)}</div>
        <div class="message-time">${message.time}</div>
    `;

    container.appendChild(div);
    scrollToBottom();

    console.log('✅ Message added to UI:', message.text);
}

function displayAllMessages() {
    const roomKey = getRoomKey(currentRoom, currentPassword);
    const messages = rooms[roomKey] || [];
    const container = document.getElementById('messages');
    container.innerHTML = '';

    messages.forEach(msg => {
        addMessageToUI(msg);
    });
}

function scrollToBottom() {
    const container = document.getElementById('messages');
    setTimeout(() => {
        container.scrollTop = container.scrollHeight;
    }, 0);
}

function leaveChat() {
    stopPolling();
    document.getElementById('setupSection').style.display = 'flex';
    document.getElementById('chatWindow').style.display = 'none';
    document.getElementById('usernameInput').value = '';
    document.getElementById('roomInput').value = '';
    document.getElementById('passwordInput').value = '';
    document.getElementById('messageInput').value = '';
    currentUser = '';
    currentRoom = '';
    currentPassword = '';
    console.log('✅ Left chat room');
}

function handleKeyPress(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}

function startPolling() {
    console.log('🔄 Started polling');
    pollInterval = setInterval(() => {
        if (currentRoom && currentPassword) {
            displayAllMessages();
        }
    }, 300);
}

function stopPolling() {
    if (pollInterval) {
        clearInterval(pollInterval);
        console.log('🛑 Stopped polling');
    }
}

function broadcastMessage(roomKey, message) {
    // Broadcast to other tabs via storage event
    try {
        localStorage.setItem(`chat_${roomKey}`, JSON.stringify({
            ...message,
            timestamp: Date.now()
        }));
    } catch (e) {
        console.error('Error broadcasting:', e);
    }
}

// Listen for messages from other tabs
window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('chat_')) {
        try {
            const msg = JSON.parse(e.newValue);
            const roomKey = getRoomKey(currentRoom, currentPassword);
            
            if (e.key === `chat_${roomKey}` && msg) {
                // Check if message already exists
                const roomMessages = rooms[roomKey] || [];
                if (!roomMessages.find(m => m.id === msg.id)) {
                    roomMessages.push(msg);
                    console.log('📨 Received message from other tab:', msg.text);
                }
            }
        } catch (err) {
            console.error('Error processing message from storage:', err);
        }
    }
});

function getTime() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}