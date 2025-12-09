document.addEventListener('DOMContentLoaded', () => {
    const roomId = window.location.pathname.split("/").filter(Boolean).pop();

    socket = io('/', { query: { roomId } });
    const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];
    const playerName = localStorage.getItem('playerName');
    
    socket.on('connect', () => {
        if (playerName) {
            socket.emit('register_player', { name: playerName, token, isReady : false});
        }
    });

    const panelTrack = document.getElementById('panel-track');
    const prevButton = document.getElementById('panel-prev');
    const nextButton = document.getElementById('panel-next');

    let currentPanelIndex = 0;
    const panelCount = panelTrack.children.length;

    const updatePanel = () => {
        const offset = -currentPanelIndex * 100;
        panelTrack.style.transform = 'translateX(' + offset + '%)';
    };

    prevButton.addEventListener('click', () => {
        currentPanelIndex = (currentPanelIndex - 1 + panelCount) % panelCount;
        updatePanel();
    });

    nextButton.addEventListener('click', () => {
        currentPanelIndex = (currentPanelIndex + 1) % panelCount;
        updatePanel();
    });

    updatePanel();
});
