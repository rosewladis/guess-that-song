document.addEventListener('DOMContentLoaded', async() => {
    const roomId = window.location.pathname.split("/").filter(Boolean).pop();
    const socket = io('/', { query: { roomId } });

    let container = document.getElementById("songs");
    let player = document.getElementById("player");
    let playButton = document.getElementById("play-song");
    let nextButton = document.getElementById("next-song");

    let mySongs = [];
    let currentIndex = 0;

    const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];
    const playerName = localStorage.getItem('playerName');

    socket.on('connect', () => {
        if (playerName) {
            socket.emit('register_player', { name: playerName, token });
        }
    });

    socket.on('room_update', ({ players, count, songs }) => {
        console.log('Players in room:', players, 'Count:', count);
        if (mySongs.length === 0) mySongs = songs; // only update mySongs if the list is empty (initial room update)
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
      playAtIndex(ind);
    })

    nextButton.addEventListener("click", () => {
      socket.emit('next-song')
      currentIndex += 1;
      playAtIndex(currentIndex);
    })

    playButton.addEventListener("click", () => {
      socket.emit('play-song');
      playAtIndex(currentIndex);
    });

  try {
    setTimeout(() => {
      console.log('My Songs:', mySongs);

      if (mySongs.length > 0) {
        playAtIndex(currentIndex); // should be 0
      } else {
        container.textContent = "No playable previews found.";
        console.warn("No playable previews found.");
      }
    }, 150);
  } catch (e) {
    console.error("Failed to load songs:", e);
    container.textContent = "Error loading songs.";
  }
});

