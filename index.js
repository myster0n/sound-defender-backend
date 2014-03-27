var express = require('express');
var http = require('http');
var app = express();

app.use(express.static('../sound-defender'));

// Start server.
var server = http.createServer(app);

var io = require('socket.io').listen(server);
var colors=["0000FF","00FF00","00FFFF","FF00FF","FFFF00"];
var players=[0,1,2,3,4];
var connections=0;
var host=null;
var adminvars=null;
var clients=[];
Object.clone = function (o) {
    if (o === null || typeof(o) !== 'object') return o;

    var objNew = o.constructor();

    for (var key in o)
        objNew[key] = Object.clone(o[key]);

    return objNew;
};
Object.merge = function (o1, o2) {
    var objNew = Object.clone(o1);
    for (var p in o2) {
        if (o2[p] && o2[p].constructor === Object) {
            if (!o1[p]) o1[p] = {};
            objNew[p] = Object.merge(o1[p], o2[p]);
        } else {
            objNew[p] = o2[p];
        }
    }
    return objNew;
};
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
			if(host!=null){
				host.emit('live',{player:socket.playernr});
			}
			if(connections>colors.length && host!=null){
				host.emit("fullroster");
			}
		}
	});
	socket.on("host",function(){
		host=socket;
		if(adminvars!==null){
			socket.emit('admin',adminvars);
			adminvars=null;
		}
	});
	socket.on("admin", function(data){
		if(host===null){
			if(adminvars===null){
				adminvars=data;
			}else{
				adminvars=Object.merge(adminvars,data);
			}

		}else{
			socket.emit('admin',data);
		}
	});
  	socket.on('up', function(data){
  		if(host!=null && socket.clientcolor) host.emit('up',{player:socket.playernr});
  	});
  	socket.on('down', function(data){
  		if(host!=null && socket.clientcolor) host.emit('down',{player:socket.playernr});
  	});
  	socket.on('shoot', function(data){
  		if(host!=null && socket.clientcolor) host.emit('shoot',{player:socket.playernr});
  	});
  	socket.on('kill',function(data){
  		var counter=0;
  		for(var i=0;i<clients.length;i++){
  			if(clients[i] && clients[i].playernr==data.player){
  				clients[i].emit('dead',{score:data.score});
  				break;
  			}
  		}
  	});
  	function disconnector(socket){
  		socket.disconnect();
  		clients.splice(clients.indexOf(socket),1);
  	}
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
