class PlayerManager {

    constructor(){
        this.youtubeInit();
    }

    // youtube initialization

    youtubeInit(){
        // youtube init
        // https://developers.google.com/youtube/iframe_api_reference
        // https://developers.google.com/youtube/player_parameters
        PlayerManager.updateSize('youtube');
        window.onYouTubePlayerAPIReady = this.onYouTubePlayerAPIReadyWrapper();
    }

    onYouTubePlayerAPIReadyWrapper(){
        return () => {
            console.log('PM: initializing youtube');
            this.ytPlayer = new YT.Player('youtube-player', {
                //videoId: '...',
                playerVars: {
                    autoplay: 1,
                    showinfo: 0,
                    //controls: 0,
                    //disablekb: 0,
                    modestbranding: 1,
                },
                events: {
                    onReady: () => {
                        this.initWebSocket();
                    },
                    onStateChange: PlayerManager.onYoutubeVideoStateChange
                }
            });
        };
    }

    static onYoutubeVideoStateChange(evt){
        const EndedState = 0;
        let videoState = evt.data;
        if (evt.target.getCurrentTime() === 0 && evt.target.getDuration() === 0){
            return;
        }
        if (videoState === EndedState){
            console.log('Youtube video ended. Getting next.');
            wsClient.send(JSON.stringify({
                client: 'player',
                type: 'get-next'
            }));
        }
    }

    // websocket initialization

    initWebSocket(){
        console.log('WS: initializing websocket');
        this.wsClient = new WebSocket('ws://' + location.hostname);
        this.wsClient.onopen = () => {
            console.log('WS: connection opened');
            this.initAudioVideo();
            this.playNextWrapper()();
        };
        this.wsClient.onmessage = evt => {
            console.log('WS: a message arrived');
            let message = JSON.parse(evt.data);
            this.playWithSuitablePlayer(message);
        };
        $(window).on('beforeunload', evt => {
            this.wsClient.close();
        });
    }

    initAudioVideo(){
        console.log('PM: init audio and video tags');
        PlayerManager.audioElement.on('ended', this.playNextWrapper());
        PlayerManager.videoElement.on('ended', this.playNextWrapper());
    }

    // WebSocket actions

    playNextWrapper(){
        return () => {
            console.log('PM: play next command executed');
            this.wsClient.send(JSON.stringify({
                client: 'player',
                type: 'get-next'
            }));
        }
    }

    // getters for media elements (they always change so we need to reselect them with jQ

    static get currentObject(){
        let mediaElems = {
            'youtube': PlayerManager.youtubeElement,
            'video': PlayerManager.videoElement,
            'audio': PlayerManager.audioElement
        };
        let currentKeys = Object.keys(mediaElems).filter(key => mediaElems[key].is(':visible'));
        if (currentKeys.length === 0){
            return null;
        } else {
            return {
                type: currentKeys,
                handle: mediaElems[currentKeys]
            }
        }
    }

    static get youtubeElement(){
        return $('#youtube-player');
    }

    static get videoElement(){
        return $('#video-player');
    }

    static get audioElement(){
        return $('#audio-player');
    }

    playWithSuitablePlayer(message){
        let windowType = message.type;
        let behaviorFuncs = {
            'youtube': {
                show: (message) => {
                    this.ytPlayer.loadVideoById({
                        'videoId': message.id,
                        'suggestedQuality': 'default' // this way it won't lag I guess
                    });
                    PlayerManager.youtubeElement.show();
                },
                hide: () => {
                    this.ytPlayer.clearVideo();
                    PlayerManager.youtubeElement.hide();
                }
            },
            'video': {
                show: (message) => {
                    PlayerManager.videoElement
                        .attr('src', '/media/' + message.id)
                        .show()
                        [0].play();
                },
                hide: () => {
                    PlayerManager.videoElement
                        .trigger('pause')
                        .hide();
                },
            },
            'audio': {
                show: (message) => {
                    PlayerManager.audioElement
                        .attr('src', '/media/' + message.id)
                        .show()
                        [0].play();
                },
                hide: () => {
                    PlayerManager.audioElement
                        .trigger('pause')
                        .hide();
                }
            }
        };
        if (PlayerManager.currentObject !== null){
            behaviorFuncs[PlayerManager.currentObject.type].hide();
        }
        console.log('PM: showing new media type: ' + windowType);
        PlayerManager.updateSize(windowType);
        behaviorFuncs[windowType].show(message);
    }

    static updateSize(mediaType){
        ({
            'youtube': PlayerManager.youtubeElement,
            'video': PlayerManager.videoElement,
            'audio': PlayerManager.audioElement,
        })[mediaType]
            .width($(window).width())
            .height($(window).height());
    }
}

(() => {
    let pm = new PlayerManager();
})();