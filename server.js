const express = require('express');
const http = require('http');

const routing = require('./src/routing');
const { WSManager } = require('./src/websocket');

((args) => {
    try {
        // create express web server
        const app = express();

        // routing
        routing.init(app);

        // create server & open port
        const server = http.createServer(app);
        server.listen(80, function listening() {
            console.log('HTTP: listening on %d', server.address().port);
        });

        // websocket
        let wsManager = new WSManager({server});
    } catch (ex) {
        console.log('GLOB: error', ex);
    }
})(process.argv);