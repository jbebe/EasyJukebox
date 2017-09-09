const path = require('path');
const fs = require('fs');
const http = require('http');
const WebSocket = require('ws');

const { WSManager } = require('./websocket');
const { DBManager } = require('./database');

const dbPath = path.join(__dirname, '..', 'storage', 'db.json');
const storagePath = path.join(__dirname, '..', 'storage', 'media');

exports.JukeboxManager = class JukeboxManager {

    constructor(serverPort, expressApp){
        // init DB
        this.dbManager = new DBManager(dbPath, storagePath);

        // init extra routing
        this.initRouting(expressApp);

        // create http server & open port
        const server = http.createServer(expressApp);
        server.listen(serverPort, function listening() {
            console.log('HTTP: listening on %d', server.address().port);
        });

        // init WebSocket
        let that = this;
        this.wsPlayer = null;
        this.wsManager = new WSManager({server}, (wsClient) => {
            console.log('JM: new client connected');
            wsClient.on('message', function (message) {
                that.onClientMessage.call(that, wsClient, message);
            });
        });
    }

    onClientMessage(wsClient, message) {
        console.log('WS: new client message');
        message = JSON.parse(message);
        let clientTypes = {
            player: this.onPlayerMsg,
            control: this.onControlMsg
        };
        clientTypes[message.client].call(this, wsClient, message);
    }

    // message events (based on client type)

    onPlayerMsg(wsClient, message){
        console.log('WS: player sent ' + message.type);
        let playerMsgType = {
            'get-next': this.playerGetNextAction
        };
        playerMsgType[message.type].call(this, wsClient, message);
    }

    onControlMsg(wsClient, message){
        console.log('JM: incoming control message \'' + message.type + '\'');
        let that = this;
        let controlMsgType = {
            'playlist-add': that.controlPlaylistAddAction,
            'playlist-update': that.controlPlaylistUpdateAction,
            'storage-update': that.controlStorageUpdateAction
        };
        controlMsgType[message.type].call(this, wsClient, message);
    }

    // message type based actions

    playerGetNextAction(wsClient, message){
        let isFirstPresence = false;
        if (this.wsPlayer === null){
            isFirstPresence = true;
        }
        this.wsPlayer = wsClient;
        this.sendNextMedia(isFirstPresence);
        this.sendPlaylist();
    }

    controlPlaylistAddAction(wsClient, message) {
        let playlistOldCount = this.dbManager.playlist.count();
        let id = message.data.id;
        let type = message.data.type;
        let title = null;
        if (type === 'youtube') {
            title = message.data.title;
        } else {
            title = this.dbManager.storage.findOne({ id: id }).title;
        }
        this.dbManager.playlist.insert({
            type: message.data.type,
            id: id,
            title: title,
            interval: null,
            duration: message.data.duration,
            added: new Date().toJSON()
        });
        if (playlistOldCount === 0){
            // playlist was empty, now we have to send media without asking
            this.sendNextMedia(true);
        }
        this.sendPlaylist();
    }

    controlPlaylistUpdateAction(wsClient, message) {
        this.sendPlaylist(wsClient);
    }

    controlStorageUpdateAction(wsClient, message) {
        this.sendStorage(wsClient);
    }

    // responses

    sendNextMedia(isFirstPresence){
        if (this.wsPlayer === null){
            console.log('JM: player is not connected');
            return false;
        }
        if (!isFirstPresence && this.dbManager.playlist.count() > 0){
            this.dbManager.playlist.chain()
                .simplesort('added')
                .limit(1)
                .remove();
        }
        let nextMedia = this.dbManager.playlist.chain()
            .simplesort('added')
            .limit(1)
            .data();
        if (nextMedia.length === 0){
            console.log('JM: playlist is empty');
            return false;
        } else {
            nextMedia = nextMedia[0];
        }
        console.log('JM: sending next media');
        let data = DBManager.clearDbMetadata(nextMedia);
        if (data.type === 'storage'){
            data.format = this.dbManager.storage.findOne({ id: data.id }).format;
        }
        try {
            this.wsPlayer.send(JSON.stringify(data));
        } catch (ex){
            this.wsPlayer = null;
            return false;
        }
        return true;
    }

    sendStorage(wsClient = null){
        let storageData = this.dbManager.storage.chain().simplesort('title').data();
        let responseData = JSON.stringify({
            type: 'storage-data',
            data: storageData.map(DBManager.clearDbMetadata)
        });
        if (wsClient !== null){
            console.log('JM: send storage to one client');
            wsClient.send(responseData);
        } else {
            console.log('JM: send storage to all client');
            let that = this;
            this.wsManager.sendToAll(wsClient => {
                if ((wsClient !== that.wsPlayer) && (wsClient.readyState === WebSocket.OPEN)) {
                    wsClient.send(responseData);
                }
            });
        }
    }

    sendPlaylist(wsClient = null){
        let playlistData = this.dbManager.playlist.chain().simplesort('added').data();
        let responseData = JSON.stringify({
            type: 'playlist-data',
            data: playlistData.map(DBManager.clearDbMetadata)
        });
        if (wsClient !== null){
            console.log('JM: send playlist to one client');
            wsClient.send(responseData);
        } else {
            console.log('JM: send playlist to all clients');
            let that = this;
            this.wsManager.sendToAll(client => {
                if ((client !== this.wsPlayer) && (client.readyState === WebSocket.OPEN)) {
                    client.send(responseData);
                }
            });
        }
    }

    initRouting(expressApp) {
        expressApp.use('/media/:fileChecksum', (req, res) => {
            let fileId = req.params.fileChecksum;
            let fileName = this.dbManager.storage.findOne({ id: fileId }).filename;
            res.sendFile(path.join(storagePath, fileName));
        });

        expressApp.use('/upload', (req, res) => {
            console.log('HTTP: incoming file');
            let mediaObj = JSON.parse(req.rawBody);
            mediaObj.data = Buffer.from(mediaObj.data, 'base64');
            mediaObj.fullpath = path.join(storagePath, mediaObj.filename);
            this.dbManager.addMediaToStorage(mediaObj, mediaID => {
                let playlistOldCount = this.dbManager.playlist.count();
                this.playlistAddFromStorage(mediaID);
                if (playlistOldCount === 0){
                    // playlist was empty, now we have to send media without asking
                    this.sendNextMedia(true);
                }
                this.sendPlaylist();
                this.sendStorage();
            });
        });
    }

    playlistAddFromStorage(id){
        let media = this.dbManager.storage.findOne({ id: id });
        this.dbManager.playlist.insert({
            type: 'storage',
            id: id,
            title: media.title,
            interval: null,
            duration: null,
            added: new Date().toJSON()
        });
    }
};