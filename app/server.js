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
    console.log(`Query: ${req.query.id}`);
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
    printRooms();
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
async function emitPlayerCount(roomId) {
    const ids = await io.in(roomId).allSockets(); // Set of socket ids in that room
    io.to(roomId).emit('player_count', { roomId, count: ids.size });
}
 
io.on("connection", (socket) => {
    console.log(`Socket ${socket.id} connected`);
   
    let url = socket.handshake.headers.referer;
    let pathParts = url.split("/");
    let roomId = socket.handshake.query.roomId;
    console.log(pathParts, roomId);
   
    if (!rooms.hasOwnProperty(roomId)) {
        return;
    }
 
    let numPlayers = io.sockets.adapter.rooms.get(roomId)?.size || 0;
    console.log(`${numPlayers + 1} have joined the room.`);
   
    console.log(io.sockets.adapter.rooms.get(roomId));
    rooms[roomId][socket.id] = socket;
 
    console.log('ROOMS INFO');
    printRooms();
    // console.log(Object.values(rooms));
    // for (const [roomId, socket] of Object.entries(rooms)) {
    //     console.log(`${roomId}: ${Object.entries(socket)[0]}`);
    //     // console.log(Object.entries(value), Object.values(value));
    // }
 
    // update player count on each new join
    socket.join(roomId);
    emitPlayerCount(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId}`);
 
    socket.on("disconnect", () => {
        // finalize join
        setTimeout(() => emitPlayerCount(roomId), 0);
 
        console.log(`Socket ${socket.id} disconnected from ${roomId}`);
 
        let playerCount = io.sockets.adapter.rooms.get(roomId)?.size || 0;
        console.log(`${playerCount} players remaining in room ${roomId}`);
       
        // delete connection
        delete rooms[roomId][socket.id];
        if (playerCount === 0) {
            delete rooms[roomId];
            console.log(`Room ${roomId} deleted (empty)`);
        }
  });
 
    socket.on('new_game', (data) => {
        const waitingUrl = `/waiting/${roomId}`;
 
        for (let otherSocket of Object.values(rooms[roomId])) {
        if (otherSocket.id === socket.id) {
            continue;
        }
        console.log(`Broadcasting redirect to socket ${otherSocket.id} for URL ${waitingUrl}`);
        otherSocket.emit('redirect', { url: waitingUrl });
        }
    });
});
 
let host = "0.0.0.0";
let port = 8080;
// let port = 3000;
server.listen(port, host, () => {
  console.log(`http://${host}:${port}`);
});