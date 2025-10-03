function send() {
    const textInput = document.getElementById('textInput');
    const message = textInput.value;
    if (message.trim() !== '') {
        socket.send(message);
        textInput.value = '';
    }
}

const socket = new WebSocket('wss://echo.websocket.org');

socket.addEventListener('open', function (event) {
    document.getElementById('status').textContent = 'Status: Connected';
});

socket.addEventListener('message', function (event) {
    const chat = document.getElementById('chat');
    chat.innerHTML += `<p>${event.data}</p>`;
    chat.scrollTop = chat.scrollHeight;
});

socket.addEventListener('close', function (event) {
    document.getElementById('status').textContent = 'Status: Disconnected';
});

socket.addEventListener('error', function (event) {
    document.getElementById('status').textContent = 'Status: Error';
});

// Note: This is a simple echo WebSocket example. In a real application, you would connect to your own server.
// The server would handle broadcasting messages to all connected clients.
// The echo.websocket.org service simply sends back any message you send to it.
// This is for demonstration purposes only.
// For a real chat application, you would need to implement a server-side component.
// Additionally, ensure to handle edge cases and security considerations in a production environment.
// This code is intended to be included in the gamez.html file to provide chat functionality.

// The following HTML and CSS code should be placed in the respective files to create the chat interface.
// HTML: gamez.html
// CSS: gamez.css

// End of gamez.js