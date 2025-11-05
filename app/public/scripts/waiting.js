document.addEventListener('DOMContentLoaded', () => {
    const roomId = window.location.pathname.split("/").filter(Boolean).pop();
    const readyButton = document.getElementById('is-ready');
    const socket = io({ query: { roomId: roomId } });
    socket.on("redirect", ({ url }) => window.location.href = url);
    // update room player count live
    socket.on('player_count', ({ count }) => {
        document.getElementById('player-count').textContent = String(count);
    });
 
    let code = document.getElementById('game-code').textContent;
    document.getElementById('game-code').textContent = code.replace('{code}', roomId);
 
    readyButton.addEventListener('click', () => {
        if (readyButton.classList.contains('ready')) {
            readyButton.classList.remove('ready');
        } else {
            readyButton.classList.add('ready');
        }
    });

    document.addEventListener('mouseup', (event) => {
        if (event.button == 0 && event.target.nodeName == 'BUTTON') {
            let btn = event.target.id;
            console.log(`${btn} button clicked.`);
        }
    });
});