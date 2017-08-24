class PlayerManager {

}

// youtube init
// https://developers.google.com/youtube/iframe_api_reference
// https://developers.google.com/youtube/player_parameters
var youtubePlayerElem = $('#youtube-player');
youtubePlayerElem
    .width($(window).width())
    .height($(window).height())
    .css('display', 'block');
function onYouTubePlayerAPIReady() {
    window.ytPlayer = new YT.Player('youtube-player', {
        //videoId: 'QbeBhdjW1_w',
        playerVars: {
            autoplay: 1,
            showinfo: 0,
            //controls: 0,
            disablekb: 1,
            modestbranding: 1,
        },
        events: {
            onReady: function onYouTubeVideoReady(){
                InitWebSocket();
                InitAudio();
            },
            onStateChange: OnYoutubeVideoStateChange
        }
    });
}

function OnYoutubeVideoStateChange(evt){
    var endedState = 0;
    var videoState = evt.data;
    if (evt.target.getCurrentTime() == 0 && evt.target.getDuration() == 0){
        return;
    }
    if (videoState === endedState){
        console.log('Youtube video ended. Getting next.');
        wsClient.send(JSON.stringify({
            client: 'player',
            type: 'get-next'
        }));
    }
}

function PlayYoutube(playlistItem){
    /* mediaObject = {
        id: 'cvvd-9azD1M'
    }*/
    console.log('Playing Youtube video...');
    $('#youtube-player').show();
    [HideVideo, HideAudio].forEach(fn => fn());
    ytPlayer.loadVideoById({
        'videoId': playlistItem.id,
        'suggestedQuality': 'default' // this way it won't lag
    });
}

function PlayStorage(message){
    if (message.format === 'mp3'){
        console.log('Playing mp3');
        [HideYoutube, HideVideo].forEach(fn => fn());
        let mp3Player = $('#mp3-player');
        mp3Player.show();
        mp3Player.attr('src', '/media/' + message.id);
        mp3Player[0].play();
    } else {
        console.log('Playing mp4');
        [HideYoutube, HideAudio].forEach(fn => fn());
        let videoPlayer = $('#video-player');
        videoPlayer.show();
        videoPlayer.attr('src', '/media/' + message.id);
        videoPlayer[0].play();
    }
}

function InitWebSocket(){
    window.wsClient = new WebSocket('ws://' + location.hostname);
    wsClient.onopen = function (evt) {
        console.log('Websocket opened');
        // get first media from server
        wsClient.send(JSON.stringify({
            client: 'player',
            type: 'get-next'
        }));
    };
    wsClient.onmessage = function(evt) {
        var message = JSON.parse(evt.data);
        console.log('Websocket message received (' + evt.data + '). Type is ' + message.type);
        switch(message.type) {
            case 'youtube':
                PlayYoutube(message);
                break;
            case 'storage':
                PlayStorage(message);
                break;
        }
    }
    $(window).on('beforeunload', function(evt) {
        wsClient.close();
    });
}

function InitAudio(){
    $('#mp3-player').on('ended', function(){
        console.log('Audio ended. Getting next.');
        wsClient.send(JSON.stringify({
            client: 'player',
            type: 'get-next'
        }));
    });
}

function HideYoutube(){
    ytPlayer.clearVideo();
    $('#youtube-player').hide();
}

function HideVideo(){
    $('#video-player').trigger('pause').hide();
}

function HideAudio(){
    $('#mp3-player').trigger('pause').hide();
}