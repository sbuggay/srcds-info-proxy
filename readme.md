# srcds-info-proxy

[![npm version](https://badge.fury.io/js/srcds-info-proxy.svg)](https://badge.fury.io/js/srcds-info-proxy)

srcds-info-proxy is a server to proxy [A2S_INFO](https://developer.valvesoftware.com/wiki/Server_queries#A2S_INFO) server queries through a REST endpoint.

srcds-info-proxy can be used as a way to provide game server information on your websites without having to use something like GameTracker. Below is a picture of me using it on my personal site.

![srcds-info-proxy](https://github.com/sbuggay/srcds-info-proxy/blob/master/demo/demo.png?raw=true)

## Setup

Install dependencies

```
npm install
```

Run

```
npm start
```

Now you can make a request like this:

`localhost:8080/?ip=192.168.1.3&port=27015`

If the provided ip:port is a valid RCON supported server, you should get back a JSON response like this:

key | value
--- | ---
type | "I"
version | 17
serverName | "LinuxGSM"
map | "de_mirage"
gameType | "csgo"
gameName | "Counter-Strike: Global Offensive"
appID | 730
numPlayers | 0
maxPlayers | 16
numBots | 0
dedicated | "dedicated"
os | "Linux"
password | 0
secure | true
gameVersion | "1.36.2.6"
ip | "192.168.1.3"
port | 27015
pw | false

There is optional HTTPS support. If you provide absolute paths to your cert and key with `P_CERT` AND `P_KEY` env variables, `srcds-info-proxy` will also start an HTTPS server.

## servers.txt

There is support for a `servers.txt` file where you can put all the servers you manage in a newline seperate text file:

```
192.168.1.1:27015
10.0.0.1:27015
1.1.1.1:27020
```

You can then access this information through `/servers`.

```
["192.168.1.1:27015","10.0.0.1:27015","1.1.1.1:27020"]
```