document.addEventListener('DOMContentLoaded', async() => {
    const roomId = window.location.pathname.split("/").filter(Boolean).pop();
    const socket = io('/', { query: { roomId } });

    let container = document.getElementById("songs");
    let player = document.getElementById("player");
    let playButton = document.getElementById("play-song");
    let nextButton = document.getElementById("next-song");
    let songNumDisplay = document.getElementById('song-num');

    // guess submission logic
    let guessInput = document.getElementById('guess');
    let submitButton = document.getElementById('submit');

    submitButton.addEventListener('click', function() {
        const inputValue = guessInput.value;
        console.log(`You entered: ${inputValue}`);
        guessInput.value = '';
        guessInput.disabled = true;
        submitButton.style = "background-color: grey; box-shadow: inset 0 0 20px 5px grey;"
        socket.emit('player_ready', { isReady : true });
    });

    let mySongs = [];
    let currentIndex = 0;
    let isHost = false;

    const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];
    const playerName = localStorage.getItem('playerName');
    console.log('playerName:', playerName)

    socket.on('connect', () => {
        if (playerName) {
            socket.emit('register_player', { name: playerName, token, isReady : false});
        }
    });

    socket.on("redirect", ({ url }) => window.location.href = url);

    // TODO: split songs update from player update
    socket.on('room_update', ({ players, count, songs }) => {
        console.log('Players in room:', players, 'Count:', count);
        let thisPlayer = players.find(obj => obj.socket_id === socket.id);
        if (thisPlayer) {
            isHost = thisPlayer.host;
            console.log(`This player is${isHost ? '' : ' NOT'} the host.`);
        }
        let numPlayersSubmitted = players.filter(obj => obj.ready).length;
        console.log("Players submitted:", numPlayersSubmitted);
        playButton.style.display = isHost ? 'inline' : 'none';
        nextButton.style.display = isHost && (count > 0) && (numPlayersSubmitted === count) ? 'inline' : 'none';
        // initialize mySongs and autoplay on inital room update
        if (mySongs.length === 0) {
          mySongs = songs;
          console.log('My Songs:', mySongs);
          try {
              if (mySongs.length > 0) {
                playAtIndex(currentIndex); // should be 0
              } else {
                container.textContent = "No playable previews found.";
                console.warn("No playable previews found.");
              }
          } catch (e) {
            console.error("Failed to load songs:", e);
            container.textContent = "Error loading songs.";
          }
        }
    });

    function playAtIndex(i) {
      if (i < 0 || i >= mySongs.length) return;

      const s = mySongs[i];
      if (!s?.preview) return;

      player.src = s.preview;

      player.currentTime = 0;
      player.play().catch(err => {
        console.warn("Play blocked:", err);
      });
    }

    player.onended = () => {
      console.log("Song ended; not auto-playing next.");
    };
   
    socket.on('play-song-at', ({ ind }) => {
      currentIndex = ind; // for host these should be the same
      playAtIndex(currentIndex);
    })

    socket.on('next-song-at', ({ ind }) => {
      currentIndex = ind; // for host these should be the same
      songNumDisplay.textContent = `Song ${currentIndex + 1}`
      playAtIndex(currentIndex);
      // re-enable guess submission
      guessInput.disabled = false;
      submitButton.style = "background-color: rgb(95, 0, 197); box-shadow: inset 0 0 20px 5px rgb(112, 0, 232);"
    })

    playButton.addEventListener("click", () => {
      socket.emit('play-song');
      playAtIndex(currentIndex);
    });

    nextButton.addEventListener("click", () => {
        socket.emit('next-song');
        if (currentIndex >= mySongs.length -1) {
            setTimeout(() => {
                window.location.href = `/leaderboard/${roomId}`}, 150
            );
        }
    });

});

