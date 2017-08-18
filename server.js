const WebSocket = require('ws');
const express = require('express');
const http = require('http');
const fs = require('fs');

// create express web server
const app = express();

const storageDir = __dirname + '/storage';

// default root is control so it's easy to reach
app.get('/', function (req, res) {
	res.sendFile(__dirname + '/control.html');
});

app.get('/player', function (req, res) {
	res.sendFile(__dirname + '/player.html');
});

app.use('/storage', express.static('storage'));

const server = http.createServer(app);
server.listen(80, function listening() {
  console.log('Started listening on %d', server.address().port);
});

// create websocket server
const wss = new WebSocket.Server({ server });
wss.on('connection', function connection(ws) {
	ws.on('message', function incoming(message) {
		console.log('Incoming: ' + message);
		message = JSON.parse(message);
		switch (message.client){
			case 'player':
				HandleDataFromPlayer(message, ws);
				break;
			case 'control':
				HandleDataFromControl(message, ws);
				break;
		}
	});
});

wss.on('close', function connection(ws) {
	if (ws === playerSocket){
		console.log('Player socket is closed');
		playerSocket = null;
	}
});

var playerSocket = null;

function HandleDataFromPlayer(message, ws){
	switch (message.type){
		case 'get-next':
			playerSocket = ws;
			if (playlist.length === 0){
				console.log('Playlist is now empty!');
				current = null;
			} else {
				SendNextMedia();
			}
			UpdateControlPlaylist();
			break;
	}
}

function HandleDataFromControl(message, ws){
	switch (message.type){
		case 'playlist-add':
			playlist.push({
				type: message['media-type'],
				id: message.id,
				title: message.title,
				start: message.start,
				end: message.end,
				duration: message.duration
			});
			if (current === null){
				SendNextMedia();
			}
			UpdateControlPlaylist();
			break;
		case 'playlist-update':
			UpdateControlPlaylist(ws);
			break;
		case 'storage-update':
			UpdateControlStorage(ws);
			break;
	}
}

function SendNextMedia(){
	if (playerSocket === null){
		console.log('Player is not connected!');
		return;
	}
	current = playlist.shift();	
	playerSocket.send(JSON.stringify({
		type: current.type,
		id: current.id,
		start: current.start,
		end: current.end
	}));
}

function UpdateControlStorage(ws = null){
	fs.readdir(storageDir, (err, files) => {
		var data = JSON.stringify({
			type: 'storage-update',
			storage: files.reduce((collected, file, all) => {
				if (fs.statSync(storageDir + '/' + file).isDirectory()){
					return collected;
				}
				collected.push({ title: file });
				return collected;
			}, [])
		});
		if (ws !== null){
			ws.send(data); 
		} else {
			wss.clients.forEach(function each(client) {
				if ((client !== playerSocket) && (client.readyState === WebSocket.OPEN)) {
					client.send(data);
				}
			});
		}
	})
}

function UpdateControlPlaylist(ws = null){
	console.log('Update playlist.');
	var playlistWithCurrent;
	if (current === null){
		playlistWithCurrent = [...playlist];
	} else {
		playlistWithCurrent = [current, ...playlist];
	}
	var data = JSON.stringify({
		type: 'playlist-update',
		playlist: playlistWithCurrent.map(media => ({
			title: media.title
		}))
	});
	if (ws !== null){
		ws.send(data); 
	} else {
		wss.clients.forEach(function each(client) {
			if ((client !== playerSocket) && (client.readyState === WebSocket.OPEN)) {
				client.send(data);
			}
		});
	}
}

// jukebox logic
var current = null;
var playlist = [];