document.addEventListener('DOMContentLoaded', () => {
    const confirmationPopup = document.querySelector('div.popup');
    const confirmCreate = document.getElementById('confirm');
 
    document.getElementById('back').addEventListener('click', () => {
        confirmationPopup.classList.remove('show');
        document.querySelector('html').style.pointerEvents = 'auto';
    });
 
    document.getElementById('finish').addEventListener('click', () => {
        confirmationPopup.classList.add('show');
        document.querySelector('html').style.pointerEvents = 'none';
        document.querySelector('div.popup').style.pointerEvents = 'auto';
    });

    confirmCreate.addEventListener("click", async () => {
        let response = await fetch("/generate", { method: "POST" })
        let { roomId } = await response.json();
        // redirect to room
        window.location = `/waiting/${roomId}`;
    });

    document.addEventListener('click', (event) => {
        if (event.target.nodeName == 'BUTTON' && event.target.classList.contains('answer-choice')) {
            if (event.target.classList.contains('ready')) {
            event.target.classList.remove('ready');
            } else {
                event.target.classList.add('ready');
            }
        }
    });
});