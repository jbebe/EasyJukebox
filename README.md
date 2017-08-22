## EasyJukebox

#### Structure:

```
   player.html                             server.js                           control.html
+--------------+                    +-------------------+                    +---------------+
|              | 1                1 |                   | 1             1..* |               |
| Player (web) +-----websocket+---->+ Server (playlist) +-----websocket+-----+ Clients (web) |
|              |                    |                   |                    |               |
+--------------+                    +-------------------+                    +---------------+
```
#### Okay but how does it look?
|Storage|YouTube|
|:---:|:---:|
|<img src="https://raw.githubusercontent.com/jbebe/EasyJukebox/master/docs/control.png" width="100%">|<img src="https://raw.githubusercontent.com/jbebe/EasyJukebox/master/docs/control2.png" width="100%">|

The player is just a big screen in the browser, I leave it to your imagination.

#### Tools:

* Node.js 6
* jQuery 3
* Bootstrap 4
* WebSocket
* YouTube IFrame Api

#### Usage

1. `git clone https://github.com/jbebe/EasyJukebox.git`
2. `cd EasyJukebox`
3. `npm install`
4. `node server`

##### Extra

Issues are/were created to organize TODO-s but if You need to create new issues I won't stop You.       