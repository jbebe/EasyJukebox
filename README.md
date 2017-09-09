## EasyJukebox

**Table of contents**

1. [Introduction](#introduction)
2. [Some paragraph](#paragraph1)
    1. [Sub paragraph](#subparagraph1)
3. [Another paragraph](#paragraph2)
---

#### Objects:

* **Playlist item**
  ```text
  type: 'youtube' | 'audio' | 'video'
  id: '<youtube-video-id>' | '<file-hash>'
  title: '<youtube-video-title>' | '<filename w/o extension>'
  interval: null (default) | { start: <seconds>, end: <seconds> }
  duration: <seconds>,
  added: '<utc-date>' (stackoverflow.com/a/13646568/1549007)
  ```

* **Storage item (media)**
   ```text
   type: 'audio' | 'video'
   id: '<file-hash>'
   title: '<filename w/o extension>'
   filename: '<filename>' (to be able to load file from path)
   ```
   
* **Next media**
   ```text
   type: 'youtube' | 'storage'
   id: '<youtube-video-id>' | '<file-hash>'
   format: 'mp3' | 'mp4' (only when .type is 'storage')
   ```

#### Structure: <a id="introduction"></a>

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