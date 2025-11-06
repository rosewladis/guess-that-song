document.addEventListener('DOMContentLoaded', () => {
    const roomId = window.location.pathname.split("/").filter(Boolean).pop();

    const displayName = document.getElementById("display-name");
    const readyButton = document.getElementById('is-ready');
    const messageBox = document.querySelector('div.message.error');

    const socket = io({ query: { roomId } });

    let registered = false;

    // listen for room updates
    socket.on('room_update', ({ players, count }) => {
        document.getElementById('player-count').textContent = count ?? 0;

        const list = document.getElementById('player-list');
        if (list) {
            list.innerHTML = players
                .map(p => `<li>${p.name} ${p.ready ? '✅' : '❌'}</li>`)
                .join('');
        }
    });

    socket.on('error_message', ({ error }) => {
        messageBox.textContent = error;
    });

    let code = document.getElementById('game-code').textContent;
    document.getElementById('game-code').textContent = code.replace('{code}', roomId);

    readyButton.addEventListener('click', () => {
        const name = displayName.value.trim();
        if (!name) {
            messageBox.textContent = 'Please enter a valid name.';
            return;
        }

        messageBox.textContent = '';
        const isReady = readyButton.classList.toggle('ready');

        if (!registered) {
            // register as a player if not already
            socket.emit('register_player', { name });
            registered = true;
        }
        
        // notify server of ready/unready state
        socket.emit('player_ready', { isReady });
        console.log(`Player '${name}' is ${isReady ? 'READY' : 'NOT READY'} in room ${roomId}.`);  
    });
});
