let express = require("express");
let http = require("http");
let { Server } = require("socket.io");

let path = require('path');
let ejs = require('ejs');
 
let app = express();
let server = http.createServer(app);
let io = new Server(server, { cors: { origin: "*" }});
 
app.use(express.json());
app.use(express.static("public", {extensions: ['html']}));

// ejs setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public', 'views'));
 
// helper function for template rendering
async function renderTemplate(res, page, data = {}) {
    const content = await ejs.renderFile(`public/views/pages/${page}.ejs`, data);
    const full = await ejs.renderFile('public/views/layouts/main.ejs', {
        ...data,
        body: content
    });
    res.send(full);
}
 
// redirect to game page
app.get('/', (req, res) => {
    console.log(`GET request to ${req.url}`);
    renderTemplate(res, 'home', {title: 'Home'});
});

app.get('/join', (req, res) => {
    console.log(`GET request to ${req.url}`);
    let roomId = req.query.id;
    if (roomId && !rooms.hasOwnProperty(roomId)) {
        console.log(`Code ${roomId} invalid.`);
        return res.status(404).json({error: 'Invalid code'});
    }
    renderTemplate(res, 'home', {title: 'Home'})
});
 
app.get('/spotifylogin', (req, res) => {
    console.log(`GET request to ${req.url}`);
    renderTemplate(res, 'spotifylogin', {title: 'SpotifyLogin'})
});
 
// global object to hold socket objects, display names, and ready statuses
let rooms = {};
let deleted_sockets = {}; // {roomId: sockets}
 
function generateRoomCode() {
  let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";
  for (let i = 0; i < 4; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}
 
// for debugging
function printRooms() {
  for (let [roomId, sockets] of Object.entries(rooms)) {
    console.log(roomId);
    for (let [socketId, socket] of Object.entries(sockets)) {
      console.log(`\t${socketId}`);
    }
  }
}
 

//grab slider number and set it to roms quiz num
app.post("/generate", (req, res) => {
  const { selectedValue } = req.body || {};
  if (selectedValue == null) {
    return res.status(400).json({ error: "selectedValue is required" });
  }
  let roomId = generateRoomCode();
  rooms[roomId] = {};
  rooms[roomId]['sockets'] = {}
  rooms[roomId]['all_songs'] = [];
  rooms[roomId]['num_questions'] = selectedValue;
  rooms[roomId]['question_ind'] = 0;
  deleted_sockets[roomId] = [];
  console.log(`${req.method} request to ${req.url}`);
  console.log("SelectedValue from Client:", selectedValue)
  return res.json({ roomId });
});
 
app.get("/create", (req, res) => {
  renderTemplate(res, 'create', {title: 'Create'});
});
 
app.get('/waiting/:roomId', (req, res) => {
    let { roomId } = req.params;
    if (!rooms.hasOwnProperty(roomId)) {
        console.log(`Could not find room ${roomId}`);
      return res.status(404).send();
    }
    console.log(`Found room ${roomId}`);
    console.log(`GET request to ${req.url}`);
    let playerCount = (io.sockets.adapter.rooms.get(roomId)?.size || 0) + 1;
    renderTemplate(res, 'waiting', {title: 'Waiting', roomId});
});


app.get('/play/:roomId', (req, res) => {
    let { roomId } = req.params;
    if (!rooms.hasOwnProperty(roomId)) {
      return res.status(404).send();
    }
    console.log(`GET request to ${req.url}`);
    renderTemplate(res, 'play', {title: 'Play'});
});
 
// socket functions

// emit player count + list to all sockets in the room
function emitRoomUpdate(roomId) {
    const roomSockets = rooms[roomId]['sockets'] || {};
    const players = Object.values(roomSockets).map(p => ({
        socket_id: p.socket.id,
        name: p.name,
        token: p.token,
        ready: p.ready,
        host: p.host,
        score: p.score,
    }));
    const count = Object.keys(roomSockets).length;
    const songs = rooms[roomId]['all_songs'];
    io.to(roomId).emit('room_update', { players, count, songs });
}

io.on('connection', (socket) => {
    const { roomId } = socket.handshake.query;

    if (!roomId || !rooms[roomId]) {
        socket.emit('error_message', { error: "Invalid room ID" });
        return;
    }

    console.log(`Socket ${socket.id} connected to room ${roomId} as observer`);

    socket.join(roomId);
    emitRoomUpdate(roomId);

    socket.on('register_player', ({ name, token, isReady }) => {
        if (!name) return;

        // reattach to existing player if token exists
        const existingPlayer = Object.values(rooms[roomId]['sockets']).find(p => p.token === token) 
                                || Object.values(deleted_sockets[roomId]).find(p => p.token === token);
        if (token && existingPlayer) {
            console.log(`Restoring player ${name} with token ${token}`);
            // replace old socket with new one
            delete rooms[roomId]['sockets'][existingPlayer.socket.id];
            rooms[roomId]['sockets'][socket.id] = {
                ...existingPlayer,
                socket,
                socket_id: socket.id,
                name,
            };
        } else {
            // new registration (from ready button)
            const songs = token ? (topTwenties[token] || []) : [];
            rooms[roomId]['sockets'][socket.id] = {
                socket,
                name,
                token: token || null,
                ready: isReady,
                host: Object.keys(rooms[roomId]['sockets']).length === 0,
                score: 0
            };
            console.log(`New player ${name} registered in room ${roomId}`);
            rooms[roomId]['all_songs'].push(...songs);
        }

        emitRoomUpdate(roomId);
    });


    socket.on('player_ready', ({ isReady }) => {
        if (rooms[roomId]['sockets'][socket.id]) {
            rooms[roomId]['sockets'][socket.id].ready = isReady;
            emitRoomUpdate(roomId);
        }
    });

    // create new list send that new list back to all songs 
    socket.on('play', () => {
        let master_tmp_song_list = rooms[roomId]['all_songs'].filter(song => song.preview && typeof song.preview === 'string' && song.preview.trim().length > 0);
        let numQuestions = rooms[roomId]['num_questions'];
        let tmp = []
        for(let i=0; i< numQuestions; i++){
          let randomGen = Math.floor(Math.random() * master_tmp_song_list.length);
          const [song] = master_tmp_song_list.splice(randomGen, 1);
          tmp.push(song)
        }
        rooms[roomId]['all_songs'] = tmp;
  
        // redirect after new list is created
        const playUrl = `/play/${roomId}`;
        for (let player of Object.values(rooms[roomId]['sockets'])) {
            player.ready = false; // now ready means "player has submitted an answer to the current question"
            if (player.socket.id !== socket.id) {
                player.socket.emit('redirect', { url: playUrl });
            }
        }

        emitRoomUpdate(roomId);
    });
    
    socket.on('play-song', () => {
        for (let player of Object.values(rooms[roomId]['sockets'])) {
              if (player.socket.id !== socket.id) {
                  player.socket.emit('play-song-at', { ind: rooms[roomId]['question_ind'] });
              }
          }
    });

    socket.on('next-song', () => {
        rooms[roomId]['question_ind'] += 1;
        if (rooms[roomId]['question_ind'] >= rooms[roomId]['num_questions']) {
          console.log(`Room ${roomId} reached the end of their quiz.`);
        } else {
          for (let player of Object.values(rooms[roomId]['sockets'])) {
              player.ready = false; // current question has changed
              player.socket.emit('next-song-at', { ind: rooms[roomId]['question_ind'] });
          }
          emitRoomUpdate(roomId);
        }
    });


    socket.on('increment_score', () => {
        if (rooms[roomId]['sockets'][socket.id]) {
            rooms[roomId]['sockets'][socket.id].score += 1;
        }
    });

  
    socket.on('disconnect', () => {
        if (rooms[roomId]['sockets'][socket.id]) {
            console.log(`Player ${rooms[roomId]['sockets'][socket.id].name} disconnected from room ${roomId}`);
            if (rooms[roomId]['sockets'][socket.id].token) {
              deleted_sockets[roomId].push(rooms[roomId]['sockets'][socket.id]);
            }
            delete rooms[roomId]['sockets'][socket.id];

            emitRoomUpdate(roomId);
            
            if (rooms[roomId]['question_ind'] === rooms[roomId]['num_questions']) {
              delete deleted_sockets[roomId];
              delete rooms[roomId];
            }
        }
    });
});



// Spotify related 
let client_id = process.env.SPOTIFY_CLIENT_ID;
let client_secret = process.env.SPOTIFY_CLIENT_SECRET;
let redirect_uri = process.env.SPOTIFY_REDIRECT_URI || "https://guess-that-song.fly.dev/callback";
let cookies = require('cookie-parser');
app.use(cookies());
let querystring = require('querystring');
const { emit } = require("process");
// let listSongNames = [];
let topTwenties = {}; // {token: [listOfSongNames]}


function generateRandomString(l_num){
  let string = '';
  let alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  for (let i = 0; i < l_num; i++){
    string += alphabet.charAt(Math.floor(Math.random()*alphabet.length));
  }

  return string;
}




//Spotify Login 
app.get('/login', function(req, res) {

  let state = generateRandomString(16);
  res.cookie('spotify_auth_state', state);
  let scope = 'user-read-private user-read-email user-top-read';

  res.redirect('https://accounts.spotify.com/authorize?' +
      querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
      }));
});
 
//Calling spotify web API
async function fetchWebApi(endpoint, method, body, accessToken) {
  let options = {
    method,
    headers:{
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  };
  
  if (method !== 'GET' && method !== 'HEAD' && body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`https://api.spotify.com/${endpoint}`, options);
  return await res.json();
}

async function getTopTracks(accessToken){
  let data = (await fetchWebApi(
    'v1/me/top/tracks?time_range=long_term&limit=20',
    'GET',
    null,
    accessToken
  ))

  return data.items || [];
}

app.get('/api/songNames', (req, res) => {
  let roomId = req.query.roomId;

  return res.json(rooms[roomId]['all_songs']);
});


async function searchDeezer(songs) {
  let results = await Promise.all(
    songs.map(async (name) => {
      const url = "https://api.deezer.com/search/track?q=" + encodeURIComponent(name);

      const r = await fetch(url);
      const data = await r.json();
      const first = (data.data && data.data[0]) || null;
      // console.log("songs:", name, first?.preview || "(no preview)");

      if (!first || !first.preview) {
        return {
          query: name,
          found: false,
          deezerId: null,
          title: null,
          artist: null,
          preview: null
        };
      }

      return {
        query: name,
        found: true,
        deezerId: first.id,
        title: first.title,
        artist: first.artist?.name,
        preview: first.preview
      };
    })
  );
  return results
}

app.post('/deezer-snippets', async(req,res)=>{
  let songs = req.body.songs || [];

  try{
    let results = await searchDeezer(songs);
    res.json(results);
  }catch (e){
    console.error(e);
    res.status(500).json({error: "Deezer lookup failed"});
  }
});

//Callback
app.get('/callback', async (req,res)=>{
  try{
    let code = req.query.code;
    let state = req.query.state;
    let storedState;

    if (req.cookies){
      storedState = req.cookies['spotify_auth_state'];
    }else{
      storedState = null;
    }

    console.log("code:", code);
    console.log("state:", state);
  

    let tokenRes = await fetch('https://accounts.spotify.com/api/token',{
      method: 'POST',
      headers:{
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer
        .from(client_id + ':' + client_secret)
        .toString('base64')
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirect_uri
      })
    });



    let tokenData = await tokenRes.json();
    let accessToken = tokenData.access_token;

    let topTracks = await getTopTracks(accessToken);

    let songName = topTracks.map(track => `${track.name} ${track.artists[0].name}`);

    let deezerResult = await searchDeezer(songName);

    topTwenties[accessToken] = deezerResult;

    let trackSnippets = topTracks.map((track, i) => {
      let deezer = deezerResult[i];

      return{
        rank: i + 1,
        name: track.name,
        artists: track.artists.map(a => a.name).join(', '),
        deezerFound: deezer?.found ||false,
        deezerPreviewURL: deezer && deezer.found ? deezer.preview : null,
        deezerTitle: deezer?.title,
        deezerArtist: deezer?.artist
      };
    });


    // set cookie
    res.cookie('token', accessToken);

    // res.redirect('/create')
    res.redirect('/')
  }catch (err){
    console.error('ERROR in callback:', err);
    res.status(500).send("internal error");
  }
})

let host = "0.0.0.0";
let port = 8080;
server.listen(process.env.PORT || port, host, () => {
  console.log(`http://${host}:${port}`);
});