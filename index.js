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
var clients=[];
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
			clients.push(socket);
			connections++;
			if(connections>colors.length && host!=null){
				host.emit("fullroster");
			}
		}
	});
	socket.on("host",function(){
		host=socket;
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
  	socket.on('kill',function(data){
  		var counter=0;
  		for(var i=0;i<5;i++){
  			if(clients[i] && clients[i].playernr==data.player){
  				clients[i].emit('dead',{score:data.score});
  				colors.push(clients[i].clientcolor);
  				players.push(clients[i].playernr);
  				clients[i].disconnect();
  				counter=i;
  				break;
  			}
  		}
  		clients.splice(i,1);
  	});
  	socket.on("disconnect",function(data){
  		if(socket.clientcolor){
  			colors.push(socket.clientcolor);
  			players.push(socket.playernr);
  			clients.splice(clients.indexOf(socket),1);
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
