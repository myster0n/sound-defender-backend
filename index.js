var express = require('express');
var http = require('http');
var app = express();

app.use(express.static('../sound-defender'));

// Start server.
var server = http.createServer(app);

var io = require('socket.io').listen(server);
var colors=["#FF00FF","#FFFF00","#00FF00","#00FFFF","#0000FF"];
var players=[0,1,2,3,4];
var connections=0;
var host=null;
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
			socket.playernr=players.shift();
			socket.emit('ok',{color:socket.clientcolor});
			connections++;
		}
	});
	socket.on("host",function(){
		host=socket;
	})
  	socket.on('my other event', function (data) {
    	console.log(data);
  	});
  	socket.on('up', function(data){
  		if(host!=null) host.emit('up',{player:socket.playernr});
  	});
  	socket.on('down', function(data){
  		if(host!=null) host.emit('down',{player:socket.playernr});
  	});
  	socket.on('shoot', function(data){
  		if(host!=null) host.emit('shoot',{player:socket.playernr});
  	});
  	socket.on("disconnect",function(data){
  		if(socket.clientcolor){
  			colors.push(socket.clientcolor);
  			players.push(socket.playernr);
  			delete socket.clientcolor;
  		}
  		if(socket==host){
  			host=null;
  		}else{
  		connections--;

  		}
  	});
});

server.listen(9080);
