document.addEventListener('DOMContentLoaded', async() => {
    let container = document.getElementById("songs");
    let player = document.getElementById("player");
    let rePlay = document.getElementById("rePlay");

    let currentSnippets = [];
    let currentIndex = -1;
    let songButtons = [];
    let songNamesFromServer = [];

    async function fetchSongNames() {
        const r = await fetch('/api/songNames')
        .then(r => r.json())
        .then(data => {
            songNamesFromServer = data.map(x => 
            typeof x === 'string' ? x
            : (x.query || `${x.name} ${x.artist || ''}`.trim()))
        });
        console.log('Song Names From Server (strings):', songNamesFromServer);
        return songNamesFromServer;
    }

    async function fetchSnippets(names) {
        const res = await fetch("/deezer-snippets", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ songs: names }),
        });
        return res.json();
    }


    function findNextWithPreview(fromIdx) {
        for (let j = fromIdx; j < currentSnippets.length; j++) {
            const p = currentSnippets[j]?.preview;
            if (p && typeof p === 'string' && p.trim().length > 0) return j;
        }
        return -1;
    }

    function playAtIndex(i) {
    if (i < 0 || i >= currentSnippets.length) return;

    const s = currentSnippets[i];
    if (!s?.preview) return;

    currentIndex = i;
    player.src = s.preview;

    player.currentTime = 0;
    player.play().catch(err => {
      console.warn("Autoplay blocked. User must click play/replay once.", err);
    });
  }

  player.onended = () => {
    console.log("Song ended; not auto-playing next.");
  };

  rePlay.addEventListener("click", () => {
    if (currentIndex === -1) return; 
    player.currentTime = 0;
    player.play().catch(err => {
      console.warn("Replay blocked:", err);
    });
  });

  try {
    songNamesFromServer = await fetchSongNames();
    currentSnippets = await fetchSnippets(songNamesFromServer);

    const firstPlayable = findNextWithPreview(0);
    if (firstPlayable !== -1) {
      playAtIndex(firstPlayable);
    } else {
      container.textContent = "No playable previews found.";
      console.warn("No playable previews found.");
    }
  } catch (e) {
    console.error("Failed to load songs:", e);
    container.textContent = "Error loading songs.";
  }
});

