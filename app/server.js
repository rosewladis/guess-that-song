const pg = require("pg");
let express = require("express");
let app = express();
let port = 8080;
let hostname = "0.0.0.0";
app.use(express.json());
app.use(express.static("public"));



app.listen(port, hostname, () => {
  console.log(`Listening at: http://${hostname}:${port}`);
});