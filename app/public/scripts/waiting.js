document.addEventListener('DOMContentLoaded', () => {
    const roomId = window.location.pathname.split("/").filter(Boolean).pop();

    const displayName = document.getElementById("display-name");
    const readyButton = document.getElementById('is-ready');
    const playButton = document.getElementById('play');
    const messageBox = document.querySelector('div.message.error');

    const socket = io('/', { query: { roomId } });

    let isRegistered = false;
    let isHost = false;
    let playerList = [];

    function getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for(let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    const token = getCookie('token');

    // listen for room updates
    socket.on('room_update', ({ players, count, songs }) => {
        playerList = players;
        let thisPlayer = players.find(obj => obj.socket_id === socket.id);
        if (thisPlayer) {
            isHost = thisPlayer.host;
            console.log(`This player is${isHost ? '' : ' NOT'} the host.`);
        }
        playButton.style.display = isHost ? 'inline' : 'none';
        console.log('players:', players);
        
        document.getElementById('player-count').textContent = count ?? 0;

        const list = document.getElementById('player-list');
        if (list) {
            list.innerHTML = players
                .map(p => `<li>${p.name} ${p.ready ? '✅' : '❌'}</li>`)
                .join('');
        }
    });

    socket.on("redirect", ({ url }) => window.location.href = url);

    socket.on('error_message', ({ error }) => {
        messageBox.textContent = error;
    });

    let code = document.getElementById('game-code').textContent;
    document.getElementById('game-code').textContent = code.replace('{code}', roomId);

    readyButton.addEventListener('click', () => {
        const name = displayName.value.trim();
        if (!name || Object.values(playerList).find(p => p.name == name)) {
            messageBox.textContent = 'Please enter a valid name.';
            return;
        }
        localStorage.setItem('playerName', name);

        messageBox.textContent = '';
        const isReady = readyButton.classList.toggle('ready');

        if (!isRegistered) {
            // register as a player if not already
            socket.emit('register_player', { name, token , isReady});
            isRegistered = true;
        }
        
        // notify server of ready/unready state
        socket.emit('player_ready', { isReady });
        console.log(`Player '${name}' is ${isReady ? 'READY' : 'NOT READY'} in room ${roomId}.`);  
    });

    playButton.addEventListener('click', () => {
        socket.emit('play');
        setTimeout(() => window.location.href = `/play/${roomId}`, 150);
    })
});
