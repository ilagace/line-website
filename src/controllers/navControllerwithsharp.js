var mongodb = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
var sharp = require('sharp');
var fs = require('fs');

var navController = function(basenav, localbasenav, indexnav, indexskip, pagesize, homedir) {

    var middleware = function(req, res, next) {
        next();
    };

    var getRoot = function (req, res) {
        res.render('navigation', {nav: basenav, link: '/navigation/'});
    };

    var getByTheme = function (req, res) {
        indexnav = req.params.id;
        var theme = localbasenav[indexnav];
        var url = 'mongodb://localhost:27017/library';
        mongodb.connect(url, function(err, db) {
            var collection = db.collection('IvanPhotos');
            collection.distinct('folder', {theme: theme}, function(err, results) {
                if (results) {
                    res.render('navfolder', {nav: results.sort(), link: '/navigation/folder/'});
                } else {
                    res.render('navigation', {nav: basenav, link: '/navigation/'});
                }
            });
        });
    };
    var getSkipIndex = function (req, res) {
        var folder = req.params.id;
        indexskip = req.params.page;
        if (indexskip === '0') {
            indexnav = 0;
        } else {
            if (indexskip === '+') {
                indexnav += pagesize;
            } else {
                if (indexskip === '-') {
                    indexnav -= pagesize;
                }
            }
        }
        res.redirect('/navigation/folder/' + folder);
    };

    var getInFolder = function (req, res) {
        var folder = req.params.id;
        var url = 'mongodb://localhost:27017/library';
        mongodb.connect(url, function(err, db) {
            var collection = db.collection('IvanPhotos');
            var photocount = 0;
            var isMovie = false;
            collection.findOne({folder: folder, mediaType: 'video'}, function(err, results) {
                if (results) {
                    // Test for movies and remove them but set the flag
                    isMovie = true;
                }
                collection.count({folder: folder, mediaType: 'photo'}, function(err, results) {
                    photocount = results;
                    collection.find({folder: folder, mediaType: 'photo'}).sort({exifdate: 1, filename: 1})
                        .limit(pagesize).skip(indexnav).toArray(function(err, results) {
                        if (results && results[0] !== undefined) {
                            var themeid = localbasenav.indexOf(results[0].theme);
                            //  check if we are at the end of the folder
                            var photoend = true;
                            if (photocount > (indexnav + results.length)) {
                                photoend =  false;
                            }
                            // if folder name is v8x6 then remove it from the results
                            for (var k = 0; k < results.length; k++) {
                                if (results[k].subfolder === 'v8x6') {
                                    results[k].subfolder = '';
                                }
                            }
                            // create smaller photos to speed up the load process
                            var deldone = false;
                            for (var i = 0; i < results.length; i++) {
                                fs.unlink(homedir + 'sharp/temp' + parseInt(i), function() {
                                    if (deldone) {
                                        // wait until all files deleted before resizing
                                        deldone = false;
                                        for (var j = 0; j < results.length; j++) {
                                            var image = sharp(homedir + 'assets/' + basenav[themeid] + '/' +
                                                results[j].folder + '/' + results[j].filename);
                                            resize(j, image, results[j].filename);
                                        }
                                    }
                                });
                            }
                            deldone = true;
                            function resize(k, image, filename) {
                                image.metadata().then(function(metadata) {
                                    if (metadata.width > metadata.height) {
                                        image.resize(300, null).toFile(homedir + 'sharp/temp' + parseInt(k), function(err) {
                                            if (k === results.length - 1) {
                                                oncomplete();
                                            }
                                        });
                                    } else {
                                        image.resize(null, 500).toFile(homedir + 'sharp/temp' + parseInt(k), function(err) {
                                            if (k === results.length - 1) {
                                                oncomplete();
                                            }
                                        });
                                    }
                                });
                            }
                            // launch the web page only once the conversion is completed
                            function oncomplete() {
                                res.render('photos',  {nav: ['Back', 'Theme'],
                                            link: ['/navigation/' + themeid, '/navigation/'] ,
                                            theme: basenav[themeid], results: results,
                                            pagesize: pagesize, indexnav: indexnav, photoend: photoend,
                                            isMovie: isMovie
                                            });
                                db.close();

                            }
                        } else {
                            res.render('navigation', {nav: basenav, link: '/navigation/'});
                            db.close();
                        }
                    });
                });
            });
        });
    };

    var showVideo = function (req, res) {
        var folder = req.params.id;
        var url = 'mongodb://localhost:27017/library';
        mongodb.connect(url, function(err, db) {
            var collection = db.collection('IvanPhotos');
            var photocount = 0;
            collection.count({folder: folder}, function(err, results) {
                photocount = results;
            });
            collection.find({folder: folder, mediaType: 'video'}).sort({exifdate: 1, filename: 1}).toArray(function(err, results) {
                if (results) {
                    var themeid = localbasenav.indexOf(results[0].theme);
                    //  check if we are at the end of the folder
                    var photoend = true;
                    res.render('videos',  {nav: ['Back', 'Theme'],
                                link: ['/navigation/' + themeid, '/navigation/'] ,
                                theme: basenav[themeid], results: results,
                                pagesize: pagesize, indexnav: indexnav, photoend: photoend
                                });
                } else {
                    res.render('navigation', {nav: basenav, link: '/navigation/'});
                }
                db.close();
            });
        });
    };

    var showDiaporama = function (req, res) {
        // Test for diaporamas and fork to smil player instead
        var smilN = {'Bel':'Belanger','Lag':'Lagace'};
        var subStr = req.params.id;
        var smilName = smilN[subStr];
        var smildir = 'assets/Vieilles Photos Lagace/Diapos ' + smilName + ' Noces d Or/';
        var timex = 0;
        var timing = [];
        var filename = [];
        var timeIndex = 0;
        var fileIndex = 0;
        var startclip = 0;
        var audioFile = '';

        fs.readFile(homedir + '/' + smildir + 'audiosmil.smil', 'utf8', function(err, data) {
            for (var i = 0; i < data.length - 10; i++) {
                if (data.substr(i,3) === 'dur') {
                    timex = data.substr(i + 5,4).indexOf('s');
                    timing[timeIndex] = parseInt(data.substr(i + 5,timex));
                    timeIndex += 1;
                }
                if (data.substr(i,7) === 'img src') {
                    timex = data.substr(i + 9,30).indexOf('"');
                    filename[fileIndex] = data.substr(i + 9,timex);
                    fileIndex += 1;
                }
                if (data.substr(i,10) === 'clip-begin') {
                    timex = data.substr(i + 12,4).indexOf('s');
                    // startclip = parseInt(data.substr(i+12,timex)); not necessary...
                }
                if (data.substr(i,9) === 'audio src') {
                    timex = data.substr(i + 11,30).indexOf('"');
                    audioFile = data.substr(i + 11,timex);
                }
            }
            res.render('slideshow', {smildir: '/' + smildir, filename:filename,
                timing: JSON.stringify(timing), startclip:startclip, audioFile:audioFile});
        });
    };

    return {
        getRoot: getRoot,
        getByTheme: getByTheme,
        getSkipIndex: getSkipIndex,
        getInFolder: getInFolder,
        showVideo: showVideo,
        showDiaporama: showDiaporama,
        middleware: middleware
    };
};

module.exports = navController;