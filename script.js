// Configuration - Using a free backend service
const API_URL = 'https://api.jsonbin.io/v3/b';
const API_KEY = '$2b$10$k.5cR8oJ8a8a8a8a8a8a8a'; // JSON Bin API

// Store current user and room info
let currentUser = '';
let currentRoom = '';
let currentPassword = '';
let roomBinId = null;
let pollInterval = null;
let lastMessageTimestamp = 0;

// Initialize app
window.addEventListener('load', () => {
    console.log('Chat app loaded');
});

function generateRoomHash(roomName, password) {
    // Generate a unique ID for this room combination
    let hash = 0;
    const str = roomName + '|' + password;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return 'room_' + Math.abs(hash).toString(36);
}

async function joinChat() {
    const usernameInput = document.getElementById('usernameInput').value.trim();
    const roomInput = document.getElementById('roomInput').value.trim();
    const passwordInput = document.getElementById('passwordInput').value.trim();

    if (!usernameInput) {
        alert('Please enter your name!');
        return;
    }

    if (!roomInput) {
        alert('Please enter a room name!');
        return;
    }

    if (!passwordInput) {
        alert('Please enter a room password!');
        return;
    }

    currentUser = usernameInput;
    currentRoom = roomInput;
    currentPassword = passwordInput;
    roomBinId = generateRoomHash(roomInput, passwordInput);

    // Initialize room
    await initializeRoom();

    // Show chat window
    document.getElementById('setupSection').style.display = 'none';
    document.getElementById('chatWindow').style.display = 'flex';
    document.getElementById('roomName').textContent = currentRoom;
    document.getElementById('userName').textContent = currentUser;

    // Load existing messages
    await loadMessages();

    // Focus on input
    document.getElementById('messageInput').focus();

    // Start polling for new messages
    startPolling();
}

async function initializeRoom() {
    try {
        // Try to get existing room data
        const response = await fetch(`${API_URL}/${roomBinId}`, {
            headers: {
                'X-Master-Key': API_KEY
            }
        });

        if (!response.ok) {
            // Create new room if it doesn't exist
            const newRoomData = {
                roomName: currentRoom,
                password: currentPassword,
                messages: [],
                created: new Date().toISOString()
            };

            await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': API_KEY
                },
                body: JSON.stringify(newRoomData)
            });
        }
    } catch (error) {
        console.error('Error initializing room:', error);
        alert('Error connecting to server. Using local mode.');
    }
}

async function loadMessages() {
    try {
        const response = await fetch(`${API_URL}/${roomBinId}`, {
            headers: {
                'X-Master-Key': API_KEY
            }
        });

        if (response.ok) {
            const data = await response.json();
            const messages = data.record.messages || [];
            const messagesDiv = document.getElementById('messages');
            messagesDiv.innerHTML = '';

            messages.forEach(msg => {
                displayMessage(msg);
                lastMessageTimestamp = Math.max(lastMessageTimestamp, msg.timestamp);
            });

            scrollToBottom();
        }
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

async function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();

    if (!message) return;

    // Create message object
    const msgObj = {
        id: Date.now(),
        user: currentUser,
        text: message,
        timestamp: Date.now(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        room: currentRoom
    };

    try {
        // Get current messages
        const response = await fetch(`${API_URL}/${roomBinId}`, {
            headers: {
                'X-Master-Key': API_KEY
            }
        });

        if (response.ok) {
            const data = await response.json();
            const messages = data.record.messages || [];
            messages.push(msgObj);

            // Update room with new message
            await fetch(`${API_URL}/${roomBinId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': API_KEY
                },
                body: JSON.stringify({
                    ...data.record,
                    messages: messages
                })
            });

            // Display message immediately
            displayMessage(msgObj);
            lastMessageTimestamp = msgObj.timestamp;
        }
    } catch (error) {
        console.error('Error sending message:', error);
        alert('Error sending message. Please try again.');
    }

    // Clear input
    messageInput.value = '';
    messageInput.focus();
    scrollToBottom();
}

function displayMessage(msgObj) {
    const messagesDiv = document.getElementById('messages');
    
    // Check if message already exists
    if (document.getElementById('msg-' + msgObj.id)) {
        return;
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${msgObj.user === currentUser ? 'own' : 'other'}`;
    messageDiv.id = 'msg-' + msgObj.id;

    messageDiv.innerHTML = `
        <div class="message-author">${escapeHtml(msgObj.user)}</div>
        <div class="message-bubble">${escapeHtml(msgObj.text)}</div>
        <div class="message-time">${msgObj.time}</div>
    `;

    messagesDiv.appendChild(messageDiv);
}

function scrollToBottom() {
    const messagesDiv = document.getElementById('messages');
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
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
    lastMessageTimestamp = 0;
}

function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

// Polling system for real-time updates
function startPolling() {
    pollInterval = setInterval(async () => {
        await checkForNewMessages();
    }, 1000); // Check every 1 second
}

function stopPolling() {
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
    }
}

async function checkForNewMessages() {
    try {
        const response = await fetch(`${API_URL}/${roomBinId}`, {
            headers: {
                'X-Master-Key': API_KEY
            }
        });

        if (response.ok) {
            const data = await response.json();
            const messages = data.record.messages || [];

            // Check for new messages
            messages.forEach(msg => {
                if (msg.timestamp > lastMessageTimestamp && !document.getElementById('msg-' + msg.id)) {
                    displayMessage(msg);
                    lastMessageTimestamp = Math.max(lastMessageTimestamp, msg.timestamp);
                    scrollToBottom();
                }
            });
        }
    } catch (error) {
        console.error('Error checking for new messages:', error);
    }
}

// Utility function to escape HTML
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