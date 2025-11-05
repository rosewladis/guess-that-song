const mouseClickSound = document.getElementById('sound');

document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('mousedown', (event) => {
        if (event.button == 0 && (event.target.nodeName == 'BUTTON' || event.target.classList.contains('abutton'))) {
            console.log('Play click sound for', event.target.id);
            setTimeout(() => {
                mouseClickSound.play();
                console.log('Wait for audio');
            }, 1);
        }
    });
});