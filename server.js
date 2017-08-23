const express = require('express');

const routing = require('./src/routing');
const { JukeboxManager } = require('./src/jukebox');

(args => {
    try {
        // create express web server
        const app = express();

        // basic routing (no parametric callbacks)
        routing.basic(app);

        // instantiate server logic
        const port = 80;
        new JukeboxManager(port, app);

    } catch (ex) {
        console.log('GLOB: error', ex);
    }
})(process.argv);