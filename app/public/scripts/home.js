document.addEventListener('DOMContentLoaded', (event) => {
    let button = document.getElementById("create-game");
    button.addEventListener("click", async () => {
        let response = await fetch("/create", { method: "POST" })
        let { roomId } = await response.json();
        // redirect to room
        window.location = `/room/${roomId}`;
    });
});