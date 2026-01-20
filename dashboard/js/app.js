// Simple dashboard to display Kafka messages
// No logic or aggregation - just display messages as they arrive

// Configuration
const config = {
    // WebSocket endpoint for Kafka messages (to be configured)
    wsEndpoint: 'ws://localhost:8080/kafka',
    // Or use Server-Sent Events endpoint
    sseEndpoint: 'http://localhost:8080/events'
};

// State
let connectionStatus = 'disconnected';
const messageContainers = {
    'account-usage': document.getElementById('account-usage'),
    'billing-records': document.getElementById('billing-records'),
    'cost-data': document.getElementById('cost-data')
};
const allMessagesContainer = document.getElementById('all-messages');
const connectionStatusElement = document.getElementById('connection-status');

// Initialize
function init() {
    updateConnectionStatus('disconnected');
    showEmptyStates();
    // connect(); // Uncomment when backend is ready
}

// Update connection status UI
function updateConnectionStatus(status) {
    connectionStatus = status;
    connectionStatusElement.textContent = status === 'connected' ? 'Connected' : 'Disconnected';
    connectionStatusElement.className = `status-indicator ${status}`;
}

// Show empty state messages
function showEmptyStates() {
    Object.values(messageContainers).forEach(container => {
        container.innerHTML = '<div class="empty-state">No messages yet</div>';
    });
    allMessagesContainer.innerHTML = '<div class="empty-state">No messages yet</div>';
}

// Display a new message
function displayMessage(message) {
    const topic = message.topic || 'unknown';
    const data = message.data || message;
    const timestamp = message.timestamp || new Date().toISOString();
    
    // Create message element
    const messageElement = createMessageElement(topic, data, timestamp);
    
    // Add to topic-specific container
    const topicContainer = messageContainers[topic];
    if (topicContainer) {
        const emptyState = topicContainer.querySelector('.empty-state');
        if (emptyState) {
            topicContainer.innerHTML = '';
        }
        topicContainer.insertBefore(messageElement, topicContainer.firstChild);
        
        // Limit messages per topic (keep last 50)
        const messages = topicContainer.querySelectorAll('.message-item');
        if (messages.length > 50) {
            messages[messages.length - 1].remove();
        }
    }
    
    // Add to all messages container
    const emptyState = allMessagesContainer.querySelector('.empty-state');
    if (emptyState) {
        allMessagesContainer.innerHTML = '';
    }
    allMessagesContainer.insertBefore(messageElement.cloneNode(true), allMessagesContainer.firstChild);
    
    // Limit all messages (keep last 100)
    const allMessages = allMessagesContainer.querySelectorAll('.message-item');
    if (allMessages.length > 100) {
        allMessages[allMessages.length - 1].remove();
    }
}

// Create message element
function createMessageElement(topic, data, timestamp) {
    const div = document.createElement('div');
    div.className = `message-item ${topic}`;
    
    const header = document.createElement('div');
    header.className = 'message-header';
    
    const topicSpan = document.createElement('span');
    topicSpan.className = 'message-topic';
    topicSpan.textContent = topic;
    
    const timeSpan = document.createElement('span');
    timeSpan.className = 'message-timestamp';
    timeSpan.textContent = new Date(timestamp).toLocaleTimeString();
    
    header.appendChild(topicSpan);
    header.appendChild(timeSpan);
    
    const content = document.createElement('div');
    content.className = 'message-content';
    content.textContent = JSON.stringify(data, null, 2);
    
    div.appendChild(header);
    div.appendChild(content);
    
    return div;
}

// WebSocket connection (to be implemented when backend is ready)
function connectWebSocket() {
    // TODO: Implement WebSocket connection
    // const ws = new WebSocket(config.wsEndpoint);
    // ws.onopen = () => updateConnectionStatus('connected');
    // ws.onmessage = (event) => {
    //     const message = JSON.parse(event.data);
    //     displayMessage(message);
    // };
    // ws.onerror = () => updateConnectionStatus('disconnected');
    // ws.onclose = () => updateConnectionStatus('disconnected');
}

// Server-Sent Events connection (alternative approach)
function connectSSE() {
    // TODO: Implement SSE connection
    // const eventSource = new EventSource(config.sseEndpoint);
    // eventSource.onopen = () => updateConnectionStatus('connected');
    // eventSource.onmessage = (event) => {
    //     const message = JSON.parse(event.data);
    //     displayMessage(message);
    // };
    // eventSource.onerror = () => updateConnectionStatus('disconnected');
}

// Initialize on page load
init();
