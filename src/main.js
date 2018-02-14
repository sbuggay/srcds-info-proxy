const express = require("express");
const bodyParser = require("body-parser");
const srcds = require("srcds-info");
const package = require("../package.json");

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

//info endpoint
app.get("/", (req, res) => {

    // if no ip query param, throw error
    if (!req.query.ip) {
        res.status(400).send({
            status: "error",
            message: "please provide an ip query parameter"
        });
    }

    // if we get here just assume default port
    getStatus(req.query.ip, req.query.port).then((result) => {
        res.status(200).send(result);``
    }, (error) => {
        res.status(200).send({
            status: "error",
            message: error.toString()
        });
    });

});

// version endpoint
app.get("/v", (req, res) => {
    res.send({
        name: package.name,
        version: package.version,
        author: package.author
    });
});

// start the server
const server = app.listen(port = 8080, () => {  
    console.log(`${package.name}@${package.version} listening on port ${port}`);
});