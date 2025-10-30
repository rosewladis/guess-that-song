const pg = require("pg");
let express = require("express");
let path = require('path');
let app = express();
let ejs = require('ejs');

let hostname = "0.0.0.0";
let port = 8080;
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

app.get('/play', (req, res) => {
    console.log(`GET request to ${req.url}`);
    renderTemplate(res, 'play', {title: 'Play'});
});

app.listen(port, hostname, () => {
  console.log(`Listening at: http://${hostname}:${port}`);
});