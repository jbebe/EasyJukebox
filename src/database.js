const path = require('path');
const loki = require('lokijs');
const crc = require('crc');
const fs = require('fs');
const { EOL } = require('os');

exports.DBManager = class DBManager {

    constructor(dbDir, storagePath){
        this.storagePath = storagePath;
        this.db = new loki(dbDir, {
            autoload: true,
            autoloadCallback : this.onDbLoad(),
            autosave: true,
            autosaveInterval: 4000
        });
    }

    onDbLoad(){
        let that = this;
        return () => {
            that.playlist = that.db.getCollection('playlist');
            if (that.playlist === null) {
                that.playlist = that.db.addCollection('playlist');
            }
            that.storage = that.db.getCollection('storage');
            if (that.storage === null) {
                that.storage = that.db.addCollection('storage');
            }
            that.rebuildStorage();
            console.log('DB: playlist collection initialized');
        }
    }

    rebuildStorage(readyCallback = () => {}){
        // empty the collection
        this.storage.clear();
        // read in all media files
        fs.readdir(this.storagePath, (err, files) => {
            let unusableFiles = [];
            files.forEach(filename => {
                let filePath = path.join(this.storagePath, filename);
                if (!fs.statSync(filePath).isDirectory()) {
                    let filenameObj = path.parse(filename);
                    let type = null;
                    let format = null;
                    if (['.mp3'].includes(filenameObj.ext)){
                        type = 'audio';
                        format = 'mp3';
                    } else if (['.mp4'].includes(filenameObj.ext)){
                        type = 'video';
                        format = 'mp4';
                    }
                    if (![type, format].includes(null)){
                        this.storage.insert({
                            type: type,
                            format: format,
                            id: crc.crc32(filename).toString(16),
                            title: filenameObj.name,
                            filename: filename
                        });
                    } else {
                        unusableFiles.push(filename);
                    }
                }
            });
            if (unusableFiles.length > 0) {
                console.log(
                    unusableFiles
                        .reduce(
                            (rest, current) => rest + '\t' + current + '' + EOL,
                            'EJ: unusable files found in storage folder: ' + EOL
                        )
                        .slice(0, -(EOL.length))
                );
            }
            readyCallback();
        });
    }

    addMediaToStorage(mediaObj, readyCallback){
        let crcFilename = crc.crc32(mediaObj.filename).toString(16);
        let isNewFile = this.storage.find({ id: crcFilename }).length === 0;
        if (isNewFile){
            console.log('JM: this is a new file');
            fs.writeFile(mediaObj.fullpath, mediaObj.data, err => {
                if (err) {
                    throw err;
                }
                this.rebuildStorage(() => {
                    readyCallback(crcFilename);
                });
            });
        } else {
            console.log('JM: this media is already in the storage');
        }
    }

    static clearDbMetadata(dbItem){
        let dbItemClone = JSON.parse(JSON.stringify(dbItem));
        delete dbItemClone.meta;
        delete dbItemClone.$loki;
        return dbItemClone;
    }

};