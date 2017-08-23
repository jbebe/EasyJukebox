const WebSocket = require('ws');

exports.WSManager = class WSManager {

    constructor (httpServer, onConnectionCallback){
        this.wsServer = new WebSocket.Server(httpServer);
        this.wsServer.on('listening', WSManager.onServerListening);
        this.wsServer.on('connection', onConnectionCallback);
        this.wsServer.on('close', WSManager.onServerClose);
    }

    sendToAll(callback){
        this.wsServer.clients.forEach(callback);
    }

    // server events

    static onServerClose() {
        console.log('WS: server is closed');
    }

    static onServerListening() {
        console.log('WS: server is now listening');
    }

};
