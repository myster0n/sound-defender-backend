var express = require('express');
var http = require('http');
var app = express();

app.use(express.static('../sound-defender'));

// Start server.
var server = http.createServer(app);

var io = require('socket.io').listen(server);
io.sockets.on("connection",function(socket){
	console.log("socket");
	console.log(socket);
	socket.emit('news', { hello: 'world' });
  	socket.on('my other event', function (data) {
    	console.log(data);
  });
  	socket.on('up', function(data){
  		console.log(data);
  		console.log("up");
  	});
  	socket.on('down', function(data){
  		console.log(data);
  		console.log("down");
  	});
  	socket.on('shoot', function(data){
  		console.log(data);
  		console.log("shoot");
  	});
});

server.listen(9080);
