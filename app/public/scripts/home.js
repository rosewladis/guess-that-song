document.addEventListener('DOMContentLoaded', (event) => {
    document.addEventListener('click', (event) => {
        if (event.button == 0 && event.target.nodeName == 'BUTTON') {
            console.log(event);
            let logger = document.createElement('div');
            logger.textContent = `${event.target.id} button clicked!`;
            logger.style.color = 'white';
            document.body.appendChild(logger);
        }
    });
});