var express = require('express');
var http = require('http');
var crypto = require('crypto');
var validator = require('validator');
var fs = require("fs");
var sqlite3 = require("sqlite3").verbose();
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

var cryptoKey = "CHANGE_ME";
var scoreDBFile = "scores.db";
var nrOfPlayers = 4;

var scoreDB = new sqlite3.Database(scoreDBFile);
var countDownTime = 30000;
var startGameCountDown;
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

scoreDB.serialize(function() {
	scoreDB.run("create table if not exists scores (email TEXT, score TEXT)");
});

app.use(express.urlencoded())
app.use(express.json())
app.post('/addscore', function(req, res) {
	if (!req.param('score') || !req.param('email')) {
		res.send(400, 'Score of email adres niet meegegeven!');
		res.end();
		return;
	}

	var score=0;
	try {
		score = decryptScore(req.param('score'));
		if (!validator.isInt(score)) {
			throw new Error('Score klopt niet!');
		}

	} catch (err) {
		res.send(400, 'Score klopt niet!');
		res.end();
		return;
	}

	var email=req.param('email');
	if (!validator.isEmail(email)) {
		res.send(400, 'email adres klopt niet!');
		res.end();
		return;
	}

	var stmt = scoreDB.prepare("INSERT INTO scores VALUES (?, ?)");
	stmt.run(score, email);
	stmt.finalize();

	console.log("score: "+score+" email: "+email);
	res.send(200, 'Uw score werd opgeslaan. Bedankt!');
	res.end();
});

function decryptScore(input) {
	var decipher = crypto.createDecipher('aes256', cryptoKey);
	return decipher.update(input, 'hex', 'utf8') + decipher.final('utf8');
}

function encryptScore(score) {
	var cipher = crypto.createCipher('aes256', cryptoKey);
	return cipher.update(score, 'utf8', 'hex') + cipher.final('hex');
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
	    for (var i=0; i<players.length; i++) {
		    var player=players[i];
		    if (player && player.id === data.player && player.alive) {
			    player.alive = false;
			    if (player.socket) {
				    player.socket.emit('dead',{score:data.score, score_encrypted: encryptScore(data.score)});
			    }
			    player.socket = undefined;
			    verifyGameState();
			    break;
		    }
	    }
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
        return;
	}

	if (allAlive) {
        startGame();
        return;
	} else {
        if (!startGameCountDown) {
            startGameCountDown = setTimeout(startGame, countDownTime);
        }
    }
}

function startGame() {
    pinCode = null;
    if (startGameCountDown) {
        clearTimeout(startGameCountDown);
        startGameCountDown = null;
    }
    if (host) host.emit("startGame");
}

function initNewGame() {
    if (startGameCountDown) {
        clearTimeout(startGameCountDown);
        startGameCountDown = null;
    }
	pinCode = generatePinCode();
	if (host) host.emit("newGame", { pin: pinCode });
}

server.listen(9080);
