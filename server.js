const express = require('express');
const bodyParser = require('body-parser');

const routing = require('./src/routing');
const { JukeboxManager } = require('./src/jukebox');

function rawBody(req, res, next) {
    req.setEncoding('utf8');
    req.rawBody = '';
    req.on('data', function(chunk) {
        req.rawBody += chunk;
    });
    req.on('end', function(){
        next();
    });
}

(args => {
    try {
        // create express web server
        const app = express();
        app.use(rawBody);

        // basic routing (no parametric callbacks)
        routing.basic(app);

        // instantiate server logic
        const port = 80;
        new JukeboxManager(port, app);

    } catch (ex) {
        console.log('GLOB: error', ex);
    }
})(process.argv);