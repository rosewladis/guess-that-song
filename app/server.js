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

app.post("/create", (req, res) => {
  let roomId = generateRoomCode();
  rooms[roomId] = {};
  return res.json({ roomId });
});

app.get("/room/:roomId", (req, res) => {
  let { roomId } = req.params;
  if (!rooms.hasOwnProperty(roomId)) {
    return res.status(404).send();
  }
  console.log("Sending room", roomId);
  renderTemplate(res, 'room', {title: 'Room'})
});

io.on("connection", (socket) => {
  console.log(`Socket ${socket.id} connected`);

  // extract room ID from URL
  let url = socket.handshake.headers.referer;
  let pathParts = url.split("/");
  let roomId = pathParts[pathParts.length - 1];
  console.log(pathParts, roomId);

  // room doesn't exist - this should never happen, but jic
  if (!rooms.hasOwnProperty(roomId)) {
    return;
  }

  // add socket object to room so other sockets in same room
  // can send messages to it later
  rooms[roomId][socket.id] = socket;

  /* MUST REGISTER socket.on(event) listener FOR EVERY event CLIENT CAN SEND */

  socket.on("disconnect", () => {
    console.log(`Socket ${socket.id} disconnected`);
    delete rooms[roomId][socket.id];
  });

  socket.on("foo", ({ message }) => {
    console.log(`Socket ${socket.id} sent message: ${message}, ${roomId}`);
    console.log("Broadcasting message to other sockets");

    for (let otherSocket of Object.values(rooms[roomId])) {
      if (otherSocket.id === socket.id) {
        continue;
      }
      console.log(`Sending message ${message} to socket ${otherSocket.id}`);
      otherSocket.emit("bar", message);
    }
  });

  socket.on("hello", (data) => {
    console.log(data);
  });
});

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

app.get('/play', (req, res) => {
    console.log(`GET request to ${req.url}`);
    renderTemplate(res, 'play', {title: 'Play'});
});

let host = "0.0.0.0";
let port = 8080;
server.listen(port, host, () => {
  console.log(`http://${host}:${port}`);
});