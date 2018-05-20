var mongodb = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
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
            var collection = db.collection('LinePhotos');
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
        switch (indexskip) {
            case '0':
                indexnav = 0;
                break;
            case '+':
                indexnav += pagesize;
                break;
            case '-':
                indexnav -= pagesize;
                break;
            case 'p':
                indexnav += 3 * pagesize;
                break;
            case 'm':
                indexnav -= 3 * pagesize;
                break;
            case 'l':
                indexnav = -1;
                break;
            case 'f':
                indexnav = 0;
                break;
        }
        res.redirect('/line/navigation/folder/' + folder);
    };

    var getInFolder = function (req, res) {
        var folder = req.params.id;
        var url = 'mongodb://localhost:27017/library';
        mongodb.connect(url, function(err, db) {
            var collection = db.collection('LinePhotos');
            var photocount = 0;
            var isMovie = false;
            collection.findOne({folder: folder, mediaType: 'video'}, function(err, results) {
                if (results) {
                    // Test for movies and remove them but set the flag
                    isMovie = true;
                }
                collection.count({folder: folder, mediaType: 'photo'}, function(err, results) {
                    photocount = results;
                    if (indexnav === -1) {
                        indexnav = Math.min(Math.floor(photocount / pagesize) * pagesize,((photocount / pagesize) - 1)  * pagesize);
                    }
                    collection.find({folder: folder, mediaType: 'photo'}).sort({exifdate: 1, filename: 1})
                        .limit(pagesize).skip(indexnav).toArray(function(err, results) {
                        if (results && results[0] !== undefined) {
                            var themeid = localbasenav.indexOf(results[0].theme);
                            //  check if we are at the end of the folder
                            var photoend = true;
                            var photoplus9 = false;
                            var photominus9 = false;
                            if (photocount > (indexnav + results.length)) {
                                photoend =  false;
                            }
                            if (photocount > indexnav + 3 * pagesize) {
                                photoplus9 =  true;
                            }
                            if (indexnav > 3 * pagesize) {
                                photominus9 =  true;
                            }
                            // if folder name is v8x6 then remove it from the results
                            for (var k = 0; k < results.length; k++) {
                                if (results[k].subfolder === 'v8x6') {
                                    results[k].subfolder = '';
                                }
                            }
                            // if folder name has a plus sign then add a %2B
                            for (var l = 0; l < results.length; l++) {
                                if (results[l].folder.indexOf(' +') >= -1) {
                                    results[l].folder = results[l].folder.replace('+','%2B');
                                }
                            }
                            res.render('photos',  {nav: ['Back', 'Theme'],
                                        link: ['/navigation/' + themeid, '/navigation/'] ,
                                        theme: basenav[themeid], results: results,
                                        pagesize: pagesize, indexnav: indexnav, indexmax: photocount,
                                        photoend: photoend, isMovie: isMovie,
                                        photoplus9: photoplus9, photominus9: photominus9
                                        });
                            db.close();
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
            var collection = db.collection('LinePhotos');
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