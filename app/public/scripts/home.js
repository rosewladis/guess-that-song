document.addEventListener('DOMContentLoaded', (event) => {
    let createButton = document.getElementById("create-game");
    let joinButton = document.getElementById("join-game");
    let gameCode = document.getElementById("game-code");
 
    createButton.addEventListener('click', () => {
        window.location = '/create';
    });
 
    joinButton.addEventListener("click", () => {
        let roomId = gameCode.value ? gameCode.value.toUpperCase() : '-';
        let messageBox = document.querySelector('div.message.error');
 
        fetch(`/join?id=${roomId}`, response => {
            console.log('Client received reponse:', response.body);
            response.json();
        }).then(body => {
            console.log('Client received data:', body);
            console.log('Client received status:', body.status);
            if (body.status === 404) {
                messageBox.textContent = 'Invalid code.';
                return;
            }
            messageBox.textContent = '';
            console.log('Redirecting to waiting room for game', roomId);
            window.location = `/waiting/${roomId}`;
        }). catch (error => {
            console.log(error);
        });
    })
});
