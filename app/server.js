let express = require("express");
let http = require("http");
let { Server } = require("socket.io");
 
let path = require('path');
let ejs = require('ejs');
 
let app = express();
let server = http.createServer(app);
let io = new Server(server);
 
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
    renderTemplate(res, 'home', {title: 'Home'})
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
 
app.post("/generate", (req, res) => {
  let roomId = generateRoomCode();
  rooms[roomId] = {};
  console.log(`${req.method} request to ${req.url}`);
  return res.json({ roomId });
});
 
app.get("/create", (req, res) => {
  renderTemplate(res, 'create', {title: 'Create'})
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
    const roomSockets = rooms[roomId] || {};
    const players = Object.values(roomSockets).map(p => ({
        name: p.name,
        ready: p.ready,
        host: p.host
    }));
    const count = Object.keys(roomSockets).length;

    io.to(roomId).emit('room_update', { players, count });
}

io.on('connection', (socket) => {
    const { roomId } = socket.handshake.query;

    if (!rooms[roomId]) {
        socket.emit('error_message', { error: 'Invalid room ID' });
        socket.disconnect(true);
        return;
    }

    // join the room as an observer
    socket.join(roomId);
    emitRoomUpdate(roomId);

    // register as a real player
    socket.on('register_player', ({ name }) => {
        rooms[roomId][socket.id] = { socket, name, ready: false, host: Object.keys(rooms[roomId]).length === 0 };      
        emitRoomUpdate(roomId);
        console.log(`${name} joined room ${roomId}`);
    });

    // handle ready toggle
    socket.on('player_ready', ({ isReady }) => {
        if (rooms[roomId][socket.id]) {
            rooms[roomId][socket.id].ready = isReady;
            emitRoomUpdate(roomId);
        }
    });

    // redirect players to question page
    socket.on('play', () => {
      const playUrl = `/play/${roomId}`;
      for (let otherSocket of Object.values(rooms[roomId])) {
        if (otherSocket.socket.id === socket.id) {
            continue;
        }
        console.log(`Broadcasting redirect to socket ${otherSocket.socket.id} for URL ${playUrl}`);
        otherSocket.socket.emit('redirect', { url: playUrl });
      }
    });

    // clean up on disconnect
    socket.on('disconnect', () => {
        delete rooms[roomId][socket.id];
        if (Object.keys(rooms[roomId]).length === 0) {
            delete rooms[roomId];
        }
        emitRoomUpdate(roomId);
    });
});


function generateRandomString(l_num){
  let string = '';
  let alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  for (let i = 0; i < l_num; i++){
    string += alphabet.charAt(Math.floor(Math.random()*alphabet.length));
  }

  return string;
}

let client_id = process.env.SPOTIFY_CLIENT_ID;
let client_secret = process.env.SPOTIFY_CLIENT_SECRET;
let redirect_uri = process.env.SPOTIFY_REDIRECT_URI || "https://guess-that-song.fly.dev/callback";
let cookies = require('cookie-parser');
app.use(cookies());
let querystring = require('querystring');

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

  //console.log('Top tracks raw response:', data);
  return data.items || [];
}

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

    let toeknRes = await fetch('https://accounts.spotify.com/api/token',{
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

    let toekenData = await toeknRes.json();
    let accessToken = toekenData.access_token;
    let topTracks = await getTopTracks(accessToken);

    let trackSnippets = topTracks.map((track, i) => ({
      rank: i + 1,
      name: track.name,
      artists: track.artists.map(a => a.name).join(', '),
      previewUrl: track.preview_url
    }));

    console.log(trackSnippets);

    res.redirect('/create')
  }catch (err){
    console.error('ERROR in callback:', err);
    res.status(500).send("internal error");
  }
})

let host = "0.0.0.0";
let port = 8080;
// let port = 3000;
server.listen(port, host, () => {
  console.log(`http://${host}:${port}`);
});