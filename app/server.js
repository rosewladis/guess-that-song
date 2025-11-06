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
 
// global object to hold socket objects
// {[roomId]: {[socketId]: [...socket objects...]}}
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
        ready: p.ready
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
        rooms[roomId][socket.id] = { socket, name, ready: false };
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

    // TODO
    // socket.on('new_game', () => {
    //   const waitingUrl = `/waiting/${roomId}`;

    //   for (let otherSocket of Object.values(rooms[roomId])) {
    //     if (otherSocket.id === socket.id) {
    //         continue;
    //     }
    //     console.log(`Broadcasting redirect to socket ${otherSocket.id} for URL ${waitingUrl}`);
    //     otherSocket.emit('redirect', { url: waitingUrl });
    //   }
    // });

    // clean up on disconnect
    socket.on('disconnect', () => {
        delete rooms[roomId][socket.id];
        if (Object.keys(rooms[roomId]).length === 0) {
            delete rooms[roomId];
        }
        emitRoomUpdate(roomId);
    });
});
 
let host = "0.0.0.0";
let port = 8080;
// let port = 3000;
server.listen(port, host, () => {
  console.log(`http://${host}:${port}`);
});