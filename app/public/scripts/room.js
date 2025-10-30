document.addEventListener('DOMContentLoaded', (event) => {
    // extract room ID from URL
    let pathParts = window.location.pathname.split("/");
    let roomId = pathParts[pathParts.length - 1] ;

    function appendMessage(message) {
        let item = document.createElement("div");
        item.textContent = message;
        messagesDiv.appendChild(item);
    }

    let socket = io();
    socket.on("connect", () => { console.log("I am connected", socket.id); });

    let button = document.getElementById("send");
    let input = document.getElementById("input");
    let messagesDiv = document.getElementById("messages");

    button.addEventListener("click", () => {
        let message = input.value;
        if (message === "") {
        return;
        }
        console.log("Sending message:", message);
        socket.emit("foo", { message });
        appendMessage(message);
    });

    /* MUST REGISTER socket.on(event) listener FOR EVERY event SERVER CAN SEND */

    socket.on("bar", function(data) {
        console.log("Received message:", data);
        appendMessage(data);
    });
});