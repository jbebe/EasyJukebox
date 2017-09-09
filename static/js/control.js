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

function getYouTubeIdFromInput(youtubeUrl){
    if (youtubeUrl.includes('youtu.be')){
        // https://youtu.be/jR1jn8tfrLg?t=1h14m19s
        let urlData = getUrlData(youtubeUrl);
        return urlData.pathname.slice('/'.length);
    }
    if (youtubeUrl.includes('youtube.com/watch')){
        // https://www.youtube.com/watch?v=jR1jn8tfrLg&t=4459s
        let urlData = getUrlData(youtubeUrl);
        return urlData.search
            .slice('?'.length)
            .split('&')
            .filter(p => p.startsWith('v='))
            .map(p => p.slice('v='.length))[0];
    }
    if (youtubeUrl.includes('youtube.com/embed')) {
        // https://www.youtube.com/embed/jR1jn8tfrLg?start=60
        let urlData = getUrlData(youtubeUrl);
        return urlData.pathname.slice('/embed/'.length);
    }
    // jR1jn8tfrLg
    return youtubeUrl;
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
        this.initMediaUpload();
        this.initYouTubeSubmit();
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

	initYouTubeSubmit(){
        let form = $('#tab-youtube > form:first-child');
        form.on('submit', evt => {
            evt.preventDefault();
            let urlInput = $('input[name=url]', form);
            let youtubeUrl = getYouTubeIdFromInput(urlInput.val());
            getYouTubeInfo(youtubeUrl, videoInfo => {
                this.wsClient.send(JSON.stringify({
                    client: 'control',
                    type: 'playlist-add',
                    data: {
                        type: 'youtube',
                        id: youtubeUrl,
                        title: videoInfo.title
                    }
                }));
                urlInput.val('');
            });
            return false;
        })
    }

    initMediaUpload(){
        let form = $('#tab-upload > form:first-child');
        let fileElem = form.find('input[type=file]');
        let progress = $('#upload-progress');
        fileElem.on('change', evt => {
            form.find('.alert').hide(); // hide all previous alert messages
            let fileList = fileElem[0].files;
            if (fileList.length !== 1){
                form.find('.alert-danger')
                    .text('You have to select a file before uploading it!')
                    .show();
                return;
            }
            let file = fileList[0];
            let reader = new FileReader();
            reader.onload = () => {
                $.ajax({
                    url: '/upload',
                    type: 'POST',
                    processData: false,
                    contentType: 'application/json',
                    data: JSON.stringify({
                        data: btoa(reader.result),
                        filename: file.name
                    }),
                    xhr: function() {
                        let myXhr = $.ajaxSettings.xhr();
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
            };
            reader.readAsBinaryString(file);
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
			mediaItem.data('type', media.type);
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
            let type = $(evt.target).data('type');
            this.wsClient.send(JSON.stringify({
                client: 'control',
                type: 'playlist-add',
                data: {
                    'type': type,
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
