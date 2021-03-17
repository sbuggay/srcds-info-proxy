const express = require("express");
const bodyParser = require("body-parser");
const srcds = require("srcds-info");
const http = require("http");
const https = require("https");
const fs = require("fs");
const cors = require("cors");

const package = require("../package.json");

const http_port = 8040;
const https_port = 8080;

// set up the express app
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// utility function to ask scrds-info for server query info
function getStatus(address, port = 27015) {

    // a simple promise wrapper around the srcds callback
    return new Promise((resolve, reject) => {

        // create srcds-info client
        const client = srcds(address, port);

        // send the request
        client.info((error, info) => {
            if (error) {
                reject(error)
            }
            resolve(info);
            client.close();
        });
    });
}

app.use(cors());

//info endpoint
app.get("/", (req, res) => {

    // if no ip query param, throw error
    if (!req.query.ip) {
        res.status(400).send({
            status: "error",
            message: "please provide an ip query parameter"
        });
        return;
    }

    if (req.query.port <= 0 || req.query.port >= 65536)
    {
        res.status(400).send({
            status: "error",
            message: "fuck off rick"
        });
        return;
    }

    // if we get here just assume default port
    getStatus(req.query.ip, req.query.port).then((result) => {
        res.status(200).send(result);
    }, (error) => {
        res.status(200).send({
            status: "error",
            message: error.toString()
        });
    });

});

var https_options = {
    key: process.env.P_KEY ? fs.readFileSync(process.env.P_KEY) : null,
    cert: process.env.P_CERT ? fs.readFileSync(process.env.P_CERT) : null,
};

// version endpoint
app.get("/v", (req, res) => {
    res.send({
        name: package.name,
        version: package.version,
        author: package.author
    });
});

// servers endpoint
app.get("/servers", (req, res) => {
    if (!fs.existsSync("./servers.txt")) {
        res.status(200).send({
            status: "error",
            message: "no servers.txt found"
        })
    }
    else {
        const data = fs.readFileSync("./servers.txt").toString();
        const servers = data.split(/\r?\n/)
        res.status(200).send(servers);
    }
});

function start() {
    // Start http server
    http.createServer(app).listen(http_port, () => {
        console.log(`http listening on ${http_port}`);
    });

    // If we have the key and cert, start the https server
    if (https_options.key && https_options.cert) {
        https.createServer(https_options, app).listen(https_port, () => {
            console.log(`https listening on ${https_port}`);
        });
    }
}

module.exports = start;
