// Store current user and room info
let currentUser = '';
let currentRoom = 'default';
let messageHistory = {};

// Initialize app
window.addEventListener('load', () => {
    loadFromLocalStorage();
});

function joinChat() {
    const usernameInput = document.getElementById('usernameInput').value.trim();
    const roomInput = document.getElementById('roomInput').value.trim();

    if (!usernameInput) {
        alert('Please enter your name!');
        return;
    }

    currentUser = usernameInput;
    currentRoom = roomInput || 'default';

    // Save to localStorage
    localStorage.setItem('currentUser', currentUser);
    localStorage.setItem('currentRoom', currentRoom);

    // Show chat window
    document.getElementById('setupSection').style.display = 'none';
    document.getElementById('chatWindow').style.display = 'flex';
    document.getElementById('roomName').textContent = currentRoom;
    document.getElementById('userName').textContent = currentUser;

    // Load messages for this room
    loadMessagesForRoom();

    // Focus on input
    document.getElementById('messageInput').focus();

    // Start polling for new messages
    startPolling();
}

function leaveChat() {
    document.getElementById('setupSection').style.display = 'flex';
    document.getElementById('chatWindow').style.display = 'none';
    document.getElementById('usernameInput').value = '';
    document.getElementById('roomInput').value = '';
    document.getElementById('messageInput').value = '';
    stopPolling();
}

function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();

    if (!message) return;

    // Create message object
    const msgObj = {
        id: Date.now(),
        user: currentUser,
        text: message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        room: currentRoom
    };

    // Add to message history
    if (!messageHistory[currentRoom]) {
        messageHistory[currentRoom] = [];
    }
    messageHistory[currentRoom].push(msgObj);

    // Save to localStorage
    saveToLocalStorage();

    // Display message
    displayMessage(msgObj);

    // Clear input
    messageInput.value = '';
    messageInput.focus();

    // Scroll to bottom
    scrollToBottom();

    // Broadcast to other tabs/windows using storage event
    localStorage.setItem('lastMessage_' + currentRoom, JSON.stringify(msgObj));
}

function displayMessage(msgObj) {
    const messagesDiv = document.getElementById('messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${msgObj.user === currentUser ? 'own' : 'other'}`;
    messageDiv.id = 'msg-' + msgObj.id;

    messageDiv.innerHTML = `
        <div class="message-author">${msgObj.user}</div>
        <div class="message-bubble">${escapeHtml(msgObj.text)}</div>
        <div class="message-time">${msgObj.timestamp}</div>
    `;

    messagesDiv.appendChild(messageDiv);
}

function loadMessagesForRoom() {
    const messagesDiv = document.getElementById('messages');
    messagesDiv.innerHTML = '';

    if (messageHistory[currentRoom]) {
        messageHistory[currentRoom].forEach(msg => {
            displayMessage(msg);
        });
    }

    scrollToBottom();
}

function scrollToBottom() {
    const messagesDiv = document.getElementById('messages');
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

// LocalStorage functions
function saveToLocalStorage() {
    localStorage.setItem('messageHistory', JSON.stringify(messageHistory));
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem('messageHistory');
    if (saved) {
        messageHistory = JSON.parse(saved);
    }
}

// Polling system for real-time updates
let pollInterval = null;

function startPolling() {
    pollInterval = setInterval(() => {
        // Check if new message was added from another tab
        const lastMsg = localStorage.getItem('lastMessage_' + currentRoom);
        if (lastMsg) {
            const msgObj = JSON.parse(lastMsg);
            // Check if message is already displayed
            if (!document.getElementById('msg-' + msgObj.id)) {
                displayMessage(msgObj);
                scrollToBottom();
            }
        }
    }, 500);
}

function stopPolling() {
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
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

// Listen for storage changes from other tabs
window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('lastMessage_') && currentRoom && e.key === 'lastMessage_' + currentRoom) {
        const msgObj = JSON.parse(e.newValue);
        if (msgObj && !document.getElementById('msg-' + msgObj.id)) {
            displayMessage(msgObj);
            scrollToBottom();
        }
    }
});