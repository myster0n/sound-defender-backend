var express = require('express');
var http = require('http');
var app = express();

app.use(express.static('../sound-defender'));

// Start server.
var server = http.createServer(app);

var io = require('socket.io').listen(server);
var colors=["#FF00FF","#FFFF00","#00FF00","#00FFFF","#0000FF"];
var connections=0;
io.sockets.on("connection",function(socket){

	console.log("socket");
	console.log(socket);
	socket.emit('news', { hello: 'world' });
	socket.on("client",function(data){
		if(connections>colors.length){
			socket.emit('nok');
			socket.disconnect();
		}else{
			socket.clientcolor=colors.shift();
			socket.emit('ok',{color:socket.clientcolor});
			connections++;
		}
	});
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
  	socket.on("disconnect",function(data){
  		if(socket.clientcolor){
  			colors.push(socket.clientcolor);
  			delete socket.clientcolor;
  		}
  		connections--;
  	});
});

server.listen(9080);
