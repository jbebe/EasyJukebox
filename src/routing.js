const path = require('path');
const express = require('express');

module.exports = {
    init: function (app){
        const staticDir = path.join(__dirname, '..', 'static');

        // default root is control so it's easier to reach
        app.get('/', function (req, res) {
            res.sendFile(
                path.join(staticDir, 'control.html')
            );
        });

        app.get('/player', function (req, res) {
            res.sendFile(
                path.join(staticDir, 'player.html')
            );
        });

        app.use('/media', express.static('storage/media'));
    }
};