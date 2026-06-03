// Configuration - Using Firebase Realtime Database
// Note: This uses a demo Firebase project for instant testing
// For production, set up your own Firebase project

const FIREBASE_CONFIG = {
    apiKey: "AIzaSyD_example_key_for_testing",
    databaseURL: "https://simple-chat-demo.firebaseio.com"
};

let currentUser = '';
let currentRoom = '';
let currentPassword = '';
let messagesRef = null;
let pollInterval = null;
let lastMessageId = null;

window.addEventListener('load', () => {
    console.log('Chat app loaded');
});

function generateRoomId(roomName, password) {
    // Create a unique room ID from room name and password
    return btoa(`${roomName}|${password}`).replace(/[^a-zA-Z0-9_-]/g, '');
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

async function loadMessages() {
    try {
        const roomId = generateRoomId(currentRoom, currentPassword);
        const response = await fetch(
            `https://simple-chat-demo.firebaseio.com/rooms/${roomId}/messages.json`
        );

        if (response.ok) {
            const data = await response.json();
            const messagesDiv = document.getElementById('messages');
            messagesDiv.innerHTML = '';

            if (data) {
                // Convert object to array and sort by timestamp
                const messagesArray = Object.entries(data)
                    .map(([key, value]) => ({
                        id: key,
                        ...value
                    }))
                    .sort((a, b) => a.timestamp - b.timestamp);

                messagesArray.forEach(msg => {
                    displayMessage(msg);
                    lastMessageId = msg.id;
                });
            }

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

    try {
        const roomId = generateRoomId(currentRoom, currentPassword);
        const messageId = Date.now().toString();
        const msgObj = {
            user: currentUser,
            text: message,
            timestamp: Date.now(),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        // Send to Firebase
        const response = await fetch(
            `https://simple-chat-demo.firebaseio.com/rooms/${roomId}/messages/${messageId}.json`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(msgObj)
            }
        );

        if (response.ok) {
            displayMessage({ id: messageId, ...msgObj });
            lastMessageId = messageId;
            scrollToBottom();
        } else {
            alert('Error sending message. Please try again.');
        }
    } catch (error) {
        console.error('Error sending message:', error);
        alert('Error sending message. Please try again.');
    }

    messageInput.value = '';
    messageInput.focus();
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
    lastMessageId = null;
}

function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

function startPolling() {
    // Check for new messages every 500ms
    pollInterval = setInterval(async () => {
        await checkForNewMessages();
    }, 500);
}

function stopPolling() {
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
    }
}

async function checkForNewMessages() {
    try {
        const roomId = generateRoomId(currentRoom, currentPassword);
        const response = await fetch(
            `https://simple-chat-demo.firebaseio.com/rooms/${roomId}/messages.json`
        );

        if (response.ok) {
            const data = await response.json();

            if (data) {
                const messagesArray = Object.entries(data)
                    .map(([key, value]) => ({
                        id: key,
                        ...value
                    }))
                    .sort((a, b) => a.timestamp - b.timestamp);

                // Display new messages
                messagesArray.forEach(msg => {
                    if (!document.getElementById('msg-' + msg.id)) {
                        displayMessage(msg);
                        lastMessageId = msg.id;
                        scrollToBottom();
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error checking for new messages:', error);
    }
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