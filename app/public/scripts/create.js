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


    let currentSelectedValue = null;
    const minValue = 3
    const maxValue = 10
    const stepCount = maxValue - minValue + 1
    const numSlider = document.getElementById('number-slider')
    const track = document.getElementById('number-slider-track')
    const knob = document.getElementById('number-slider-knob')
    const valueLabel = document.getElementById('number-slider-value')
    const confirmButton = document.getElementById('confirm');

    let isDragging = false

    function setValueFromRatio(ratio) {
        if (ratio < 0) ratio = 0
        if (ratio > 1) ratio = 1
        const index = Math.round(ratio * (stepCount - 1))
        const selectedValue = minValue + index
        const percent = (index / (stepCount - 1)) * 100
        knob.style.left = percent + '%'
        valueLabel.textContent = selectedValue
        console.log('Selecting:', selectedValue)
        currentSelectedValue = selectedValue;
        return selectedValue
    }

    function handlePointer(clientX) {
        const rect = track.getBoundingClientRect()
        const ratio = (clientX - rect.left) / rect.width
        setValueFromRatio(ratio)
    }

    knob.addEventListener('mousedown', e => {
        isDragging = true
        e.preventDefault()
    })

    document.addEventListener('mouseup', () => {
        isDragging = false
    })

    document.addEventListener('mousemove', e => {
        if (!isDragging) return
        handlePointer(e.clientX)
    })

    track.addEventListener('mousedown', e => {
        handlePointer(e.clientX)
        isDragging = true
    })

    setValueFromRatio(0)

    confirmCreate.addEventListener("click", async () => {
        try {
            const response = await fetch("/generate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ selectedValue: currentSelectedValue }),
            });

            const { roomId } = await response.json();

            // redirect to room
            window.location = `/waiting/${roomId}`;
        } catch (err) {
            console.error("Error calling /generate:", err);
        }
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