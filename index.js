var express = require('express');
var http = require('http');
var app = express();

app.use(express.static('../sound-defender'));

// Start server.
var server = http.createServer(app);

var io = require('socket.io').listen(server);
var colors=["0000FF","00FF00","00FFFF","FF00FF","FFFF00"];
var connections=0;
var host=null;
var adminvars=null;
// var players=[];

var nrOfPlayers = 4;

var pinCode;

function Player(id, socket) {
	this.alive = false;
	this.socket = socket;
	this.id = id;
}

var players = new Array(nrOfPlayers);
for (var i=0; i<nrOfPlayers; i++) {
	players[i] = new Player(i);
}

io.sockets.on("connection",function(socket){

	socket.emit('news', { hello: 'world' });
	socket.on("client",function(data){
		var accepted = false;

		if (!pinCode) {
			socket.emit("nok", { status: "404", message: "no game found" });
			socket.disconnect();
			return;
		}

		if (pinCode != data.pin) {
			socket.emit("nok", { status: "400", message: "invalid pin code" }); // i.e. no game found
			socket.disconnect();
			return;
		}

		for (var i=0; i<players.length; i++) {
			if (!players[i] || !players[i].alive) {
				console.log("creating client");
				players[i] = new Player(i, socket);
				socket.player = players[i];
				socket.player.alive = true;
				socket.emit('ok',{color:colors[i]});
				if(host!=null){
					host.emit('live',{player:i});
				}
				accepted = true;
				break;
			}
		}

		if (accepted) {
			verifyGameState();
		} else {
			console.log(players);
			socket.emit("nok", { status: "409", message: "Game already busy." });
			socket.disconnect();
		}
	});
	socket.on("host",function(){
        console.log('received host from: '+socket.handshake.address.address);
		host=socket;
		if(adminvars!==null){
			socket.emit('admin',adminvars);
			adminvars=null;
		}
		initNewGame();
	});
	socket.on("admin", function(data){
		if(host===null){
			if(adminvars===null){
				adminvars=data;
			}else{
				adminvars.channels=data.channels||adminvars.channels;
				adminvars.scale=data.scale||adminvars.scale;
				adminvars.loudness=data.loudness||adminvars.loudness;
			}
		}else{
			console.log('admin');
			console.log(data);
			host.emit('admin',data);
		}
	});
  	socket.on('up', function(data){
  		if(host!=null && socket.player && socket.player.alive) host.emit('up',{player:socket.player.id});
  	});
  	socket.on('down', function(data){
		if(host!=null && socket.player && socket.player.alive) host.emit('down',{player:socket.player.id});
  	});
  	socket.on('shoot', function(data){
		if(host!=null && socket.player && socket.player.alive) host.emit('shoot',{player:socket.player.id});
  	});
  	socket.on('kill',function(data){
		players.every(function(player, index) {
				if (player && player.id === data.player && player.alive) {
					player.alive = false;
					if (player.socket) {
						player.socket.emit('dead',{score:data.score});
					}
					player.socket = undefined;
					return false;
				}
		});
  	});
  	socket.on("disconnect",function(data){

  		if(socket.player){
  			socket.player.alive = false;
			socket.player.socket = undefined;
  			delete socket.player;

  		}
  		if(socket==host){
  			host=null;
  		}else{
  			connections--;
			verifyGameState();
  		}
  	});
});

function generatePinCode() {
	return Math.floor(Math.random()*9000) + 1000;
}

function verifyGameState() {
    if (!host) {
        pinCode = null;
        return;
    }
	var allAlive = true;
	var allDead = true;
	
	for (var i=0; i<players.length; i++) {
		if (players[i].alive) {
			allDead = false;
		} else {
			allAlive = false;
		}
	}

	if (allDead) {
		initNewGame();
	}

	if (allAlive) {
		if (host) host.emit("startGame");
	}

}

function initNewGame() {
	pinCode = generatePinCode();
	if (host) host.emit("newGame", { pin: pinCode });
}

server.listen(9080);
