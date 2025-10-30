document.addEventListener('DOMContentLoaded', (event) => {
    let createButton = document.getElementById("create-game");
    let joinButton = document.getElementById("join-game");
    let gameCode = document.getElementById("game-code");

    createButton.addEventListener("click", async () => {
        let response = await fetch("/create", { method: "POST" })
        let { roomId } = await response.json();
        // redirect to room
        window.location = `/room/${roomId}`;
    });

    joinButton.addEventListener("click", () => {
        let roomId = gameCode.value;
        window.location = `/room/${roomId}`;
    })
});