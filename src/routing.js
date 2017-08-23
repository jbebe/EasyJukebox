const path = require('path');
const express = require('express');

module.exports = {
    basic: function (app){
        const staticDir = path.join(__dirname, '..', 'static');

        app.use('/', express.static('static'));

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
    }
};