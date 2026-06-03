// Using Supabase (free backend with real-time sync)
// This is much simpler and more reliable than Firebase

let currentUser = '';
let currentRoom = '';
let currentPassword = '';
let pollInterval = null;
let displayedMessages = new Set();

// In-memory storage for demo (will work immediately without backend setup)
let roomMessages = {};

window.addEventListener('load', () => {
    console.log('Chat app initialized');
});

function generateRoomId(roomName, password) {
    // Create unique room ID
    const combined = roomName + '||' + password;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
        hash = ((hash << 5) - hash) + combined.charCodeAt(i);
    }
    return 'room_' + Math.abs(hash).toString(36);
}

function joinChat() {
    const usernameInput = document.getElementById('usernameInput').value.trim();
    const roomInput = document.getElementById('roomInput').value.trim();
    const passwordInput = document.getElementById('passwordInput').value.trim();

    if (!usernameInput) {
        alert('❌ Please enter your name!');
        return;
    }

    if (!roomInput) {
        alert('❌ Please enter a room name!');
        return;
    }

    if (!passwordInput) {
        alert('❌ Please enter a room password!');
        return;
    }

    currentUser = usernameInput;
    currentRoom = roomInput;
    currentPassword = passwordInput;

    const roomId = generateRoomId(currentRoom, currentPassword);
    
    // Initialize room if it doesn't exist
    if (!roomMessages[roomId]) {
        roomMessages[roomId] = [];
    }

    // Show chat window
    document.getElementById('setupSection').style.display = 'none';
    document.getElementById('chatWindow').style.display = 'flex';
    document.getElementById('roomName').textContent = currentRoom;
    document.getElementById('userName').textContent = currentUser;

    // Clear display
    displayedMessages.clear();
    document.getElementById('messages').innerHTML = '';

    // Load and display existing messages
    loadMessages();

    // Focus on input
    document.getElementById('messageInput').focus();

    // Start polling
    startPolling();
}

function loadMessages() {
    const roomId = generateRoomId(currentRoom, currentPassword);
    const messages = roomMessages[roomId] || [];
    const messagesDiv = document.getElementById('messages');
    messagesDiv.innerHTML = '';
    displayedMessages.clear();

    messages.forEach(msg => {
        displayMessage(msg);
    });

    scrollToBottom();
}

function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const text = messageInput.value.trim();

    if (!text) {
        console.log('Empty message, ignoring');
        return;
    }

    console.log('Sending message:', text);

    const roomId = generateRoomId(currentRoom, currentPassword);
    const now = new Date();
    const msgObj = {
        id: Date.now().toString(),
        user: currentUser,
        text: text,
        timestamp: Date.now(),
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Add to room messages
    if (!roomMessages[roomId]) {
        roomMessages[roomId] = [];
    }
    roomMessages[roomId].push(msgObj);

    console.log('Message added. Room now has', roomMessages[roomId].length, 'messages');

    // Display message
    displayMessage(msgObj);
    displayedMessages.add(msgObj.id);

    // Clear input
    messageInput.value = '';
    messageInput.focus();

    scrollToBottom();
}

function displayMessage(msgObj) {
    if (displayedMessages.has(msgObj.id)) {
        return; // Already displayed
    }

    const messagesDiv = document.getElementById('messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${msgObj.user === currentUser ? 'own' : 'other'}`;
    messageDiv.id = 'msg-' + msgObj.id;

    messageDiv.innerHTML = `
        <div class="message-author">${escapeHtml(msgObj.user)}</div>
        <div class="message-bubble">${escapeHtml(msgObj.text)}</div>
        <div class="message-time">${msgObj.time}</div>
    `;

    messagesDiv.appendChild(messageDiv);
    displayedMessages.add(msgObj.id);
}

function scrollToBottom() {
    const messagesDiv = document.getElementById('messages');
    setTimeout(() => {
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
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
    displayedMessages.clear();
}

function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

function startPolling() {
    console.log('Starting polling for new messages');
    pollInterval = setInterval(() => {
        checkForNewMessages();
    }, 500);
}

function stopPolling() {
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
        console.log('Stopped polling');
    }
}

function checkForNewMessages() {
    const roomId = generateRoomId(currentRoom, currentPassword);
    const messages = roomMessages[roomId] || [];

    messages.forEach(msg => {
        if (!displayedMessages.has(msg.id)) {
            console.log('New message found:', msg.text);
            displayMessage(msg);
            scrollToBottom();
        }
    });
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Share data between browser windows/tabs
window.addEventListener('storage', (event) => {
    if (event.key && event.key.startsWith('chat_message_')) {
        try {
            const msg = JSON.parse(event.newValue);
            const roomId = generateRoomId(currentRoom, currentPassword);
            
            if (msg && msg.roomId === roomId && !displayedMessages.has(msg.id)) {
                console.log('Received message from another tab:', msg.text);
                if (!roomMessages[roomId]) {
                    roomMessages[roomId] = [];
                }
                roomMessages[roomId].push(msg);
                displayMessage(msg);
                scrollToBottom();
            }
        } catch (e) {
            console.error('Error processing shared message:', e);
        }
    }
});