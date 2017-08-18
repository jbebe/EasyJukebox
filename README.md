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

<img src="http://raw.githubusercontent.com/jbebe/EasyJukebox/master/control.png" width="250">
<img src="http://raw.githubusercontent.com/jbebe/EasyJukebox/master/control2.png" width="256">

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