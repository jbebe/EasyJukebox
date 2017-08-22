const path = require('path');
const fs = require('fs');
const http = require('http');
const WebSocket = require('ws');
const loki = require('lokijs');

const storageDir = path.join(__dirname, '..', 'storage', 'media');
const dbDir = path.join(__dirname, '..', 'storage', 'db.json');

exports.WSManager = class WSManager {

    constructor (httpServer){
        this.wsPlayer = null;
        this.db = new loki(dbDir, {
            autoload: true,
            autoloadCallback : initDbWrapper,
            autosave: true,
            autosaveInterval: 4000
        });
        let that = this;
        function initDbWrapper(){
            that.playlist = that.db.getCollection('playlist');
            if (that.playlist === null) {
                that.playlist = that.db.addCollection('playlist');
            }
            console.log('DB: playlist collection initialized');
        }

        this.wsServer = new WebSocket.Server(httpServer);
        this.wsServer.on('listening', WSManager.onServerListening);
        this.wsServer.on('connection', this.onClientConnectionWrapper(this));
        this.wsServer.on('close', WSManager.onServerClose);
    }

    onClientConnectionWrapper(classObj) {
        return function onClientConnection(wsClient) {
            console.log('WS: new client connected');
            wsClient.on('message', function (message) {
                classObj.onClientMessage.call(classObj, wsClient, message);
            });
        }
    }

    static onServerClose() {
        console.log('WS: server is closed');
    }

    static onServerListening() {
        console.log('WS: server is now listening');
    }

    onClientMessage(wsClient, message) {
        console.log('WS: new client message');
        message = JSON.parse(message);
        let clientTypes = {
            player: this.handlePlayerMsg,
            control: this.handleControlMsg
        };
        clientTypes[message.client].call(this, wsClient, message);
    }

    handlePlayerMsg(wsClient, message){
        console.log('WS: player sent ' + message.type);
        let playerMsgType = {
            'get-next': this.playerGetNextAction
        };
        playerMsgType[message.type].call(this, wsClient, message);
    }

    playerGetNextAction(wsClient, message){
        this.wsPlayer = wsClient;
        if (this.playlist.length === 0){
            console.log('EJ: playlist is empty');
            this.current = null;
        } else {
            this.sendNextMedia();
        }
        this.sendPlaylist();
    }

    handleControlMsg(wsClient, message){
        console.log('EJ: control sent ' + message.type);
        let controlMsgType = {
            'playlist-add': this.controlPlaylistAddAction,
            'playlist-update': this.controlPlaylistUpdateAction,
            'storage-update': this.controlStorageUpdate
        };
        controlMsgType[message.type].call(this, wsClient, message);
    }

    controlPlaylistAddAction(wsClient, message) {
        this.playlist.push({
            type: message['media-type'],
            id: message.id,
            title: message.title,
            start: message.start,
            end: message.end,
            duration: message.duration
        });
        if (this.current === null){
            this.sendNextMedia();
        }
        this.sendPlaylist();
    }

    controlPlaylistUpdateAction(wsClient, message) {
        this.sendPlaylist(wsClient);
    }

    controlStorageUpdate(wsClient, message) {
        this.updateControlStorage(wsClient);
    }

    sendNextMedia(){
        if (this.wsPlayer === null){
            console.log('EJ: player is not connected');
            return;
        }
        this.current = this.playlist.shift();
        console.log('EJ: sending next media');
        this.wsPlayer.send(JSON.stringify({
            type: this.current.type,
            id: this.current.id,
            start: this.current.start,
            end: this.current.end
        }));
    }

    updateControlStorage(wsClient = null){
        fs.readdir(storageDir, function (err, files) {
            let data = JSON.stringify({
                type: 'storage-update',
                storage: files.reduce((collected, file, all) => {
                    let filePath = path.join(storageDir, file);
                    if (fs.statSync(filePath).isDirectory()){
                        return collected;
                    }
                    collected.push({ title: file });
                    return collected;
                }, [])
            });
            if (wsClient !== null){
                wsClient.send(data);
            } else {
                this.wsServer.clients.forEach(function each(client) {
                    if ((client !== playerSocket) && (client.readyState === WebSocket.OPEN)) {
                        client.send(data);
                    }
                });
            }
        })
    }

    sendPlaylist(wsClient = null){
        var playlistWithCurrent;
        if (this.current === null){
            playlistWithCurrent = [...this.playlist];
        } else {
            playlistWithCurrent = [this.current, ...this.playlist];
        }
        var data = JSON.stringify({
            type: 'playlist-update',
            playlist: playlistWithCurrent.map(media => ({
                title: media.title
            }))
        });
        if (wsClient !== null){
            wsClient.send(data);
        } else {
            let that = this;
            this.wsServer.clients.forEach(function each(client) {
                if ((client !== that.wsPlayer) && (client.readyState === WebSocket.OPEN)) {
                    client.send(data);
                }
            });
        }
    }

};
