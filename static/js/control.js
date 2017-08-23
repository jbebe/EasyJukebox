function getUrlData(href){
    var parser = document.createElement('a');
    parser.href = href;
    var result = {
        protocol: parser.protocol,
        host: parser.host,
        hostname: parser.hostname,
        port: parser.port,
        pathname: parser.pathname,
        hash: parser.hash,
        search: parser.search,
        origin: parser.origin,
    };
    parser = null;
    return result;
}

function getYouTubeInfo(videoId, callback){
    let ytPlayer = new YT.Player('youtube-info', {
        'height': 1,
        'width': 1,
        'videoId': videoId,
        'playerVars': {
            autoplay: 0
        },
        'events': {
            onReady: evt => {
                let videoData = ytPlayer.getVideoData();
                console.log(videoData);
                ytPlayer.destroy();
                callback({
					title: videoData.title,
                    duration: videoData.duration
				});
            }
        }
    });
}

class RemoteControl {

	constructor(){
        this.initPlaylist();
        this.initWebSocket();
	}

	// initialization

    initPlaylist(){
        this.playlist = $('#playlist');
        this.playlist.sortable({
            items: 'a:not(:first-child)', // fix the first entry because it's being played
            update: function listChanged(evt, ui) {
            	// TODO: change media position in playlist
                console.log('list order changed, new pos: ' + ui.item.index());
            }
        });
    }

    initWebSocket(){
        this.wsClient = new WebSocket('ws://' + location.hostname);
        this.wsClient.onopen = this.onWSConnectedWrapper();
        this.wsClient.onmessage = this.onWSMessageWrapper();
        $(window).on('beforeunload', function(evt) {
            this.wsClient.close();
        });
	}

	onWSConnectedWrapper(){
    	return evt => {
            console.log('WS: connected to ' + this.wsClient.url);
            // update playlist and storage after websocket is open
            [
            	{ client: 'control', type: 'playlist-update' },
                { client: 'control', type: 'storage-update' }
			].map(JSON.stringify).forEach(command => {
				console.log('WS: sending message \'' + JSON.parse(command).type + '\'');
                this.wsClient.send(command);
            });
        }
	}

    onWSMessageWrapper(){
		let that = this;
		return evt => {
			let message = evt.data;
            message = JSON.parse(message);
            console.log('WS: message received, type: ' + message.type);
			({
                'storage-data': this.updateStorageUI,
                'playlist-data': RemoteControl.updatePlaylistUI
            })[message.type].call(that, message);
        }
    };

    updateStorageUI(message){
        let storage = $('#storage');
        storage.empty();
        let mediaList = message.data;
        mediaList.forEach(media => {
            let mediaItem = $('<a>');
            mediaItem.prop('href', '#');
            mediaItem.addClass('list-group-item list-group-item-action');
			mediaItem.text(media.title);
			mediaItem.data('id', media.id);
			mediaItem.click(this.onSubmitStorageWrapper());
            storage.append(mediaItem);
        });
    }

    static updatePlaylistUI(message){
        let list = $('#playlist');
        list.empty();
        let playlist = message.data;
        playlist.forEach(item => {
            list.append($('<a href="#" class="list-group-item list-group-item-action"><span class="icon-menu"></span> ' + item.title + '</a>'));
        });
    }

    onSubmitStorageWrapper(){
    	return evt => {
            evt.preventDefault();
            let id = $(evt.target).data('id');
            this.wsClient.send(JSON.stringify({
                client: 'control',
                type: 'playlist-add',
                data: {
                    'type': 'storage',
                    id: id
                }
            }));
            return false;
        }
    }
}

(() => {
	window.rc = new RemoteControl();
})();

function OnSubmitMedia(evt){
	evt.preventDefault();
	var form = this;
	var progress = $('#upload-progress');
	$.ajax({
		// Your server script to process the upload
		url: '/upload',
		type: 'POST',

		// Form data
		data: new FormData(form),

		// Tell jQuery not to process data or worry about content-type
		// You *must* include these options!
		cache: false,
		contentType: false,
		processData: false,

		// Custom XMLHttpRequest
		xhr: function() {
			var myXhr = $.ajaxSettings.xhr();
			if (myXhr.upload) {
				// For handling the progress of the upload
				myXhr.upload.addEventListener('progress', function(e) {
					if (e.lengthComputable) {
						progress.attr({
							value: e.loaded,
							max: e.total,
						});
					}
				} , false);
			}
			return myXhr;
		},
	});
	return false;
}

function OnSubmitYoutubeUrl(evt){
	evt.preventDefault();
	let urlInput = $('input[name=url]', this);
	let youtubeUrl = GetYouTubeIdFromUrl(urlInput.val());
    getYouTubeInfo(youtubeUrl, videoInfo => {
		jukeboxWS.send(JSON.stringify({
			client: 'control',
			type: 'playlist-add',
			'media-type': 'youtube',
			id: youtubeUrl,
			title: videoInfo.title
		}));
		urlInput.val('');
	});
	return false;
}

function GetYouTubeIdFromUrl(youtubeUrl){
	if (youtubeUrl.includes('youtu.be')){
		// https://youtu.be/kxX7JTYViwI
		return getUrlData(youtubeUrl).pathname.slice('/'.length);
	}
	if (youtubeUrl.includes('youtube.')){
		if (youtubeUrl.includes('/embed/')){
			// https://www.youtube.com/embed/kxX7JTYViwI
			return getUrlData(youtubeUrl).pathname.slice('/embed/'.length)
		}
		if (youtubeUrl.includes('/watch?')){
			// https://www.youtube.com/watch?v=kxX7JTYViwI
			return getUrlData(youtubeUrl).pathname.slice('/embed/'.length)
		}
	}
	// kxX7JTYViwI
	return youtubeUrl;
}

