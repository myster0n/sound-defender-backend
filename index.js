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
});

server.listen(8080);