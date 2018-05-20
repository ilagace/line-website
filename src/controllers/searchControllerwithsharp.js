var mongodb = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
var sharp = require('sharp');
var fs = require('fs');
var page = 0;
var total = 0;

var searchController = function(basenav, localbasenav, indexnav, indexskip, pagesize, homedir) {

    var middleware = function(req, res, next) {
        next();
    };

    var getEmpty = function (req, res) {
        var photoend = true;
        var isMovie = false;
        res.render('search',{stype: '', results: [],
                            pagesize: pagesize, indexnav: indexnav, photoend: photoend,
                            isMovie: isMovie, title: 'Search Page', page: page, total: total
                            });
    };

    var getSkipIndex = function (req, res) {
        var searchData = req.params.id.split('&');
        indexskip = req.params.page;
        if (indexskip === '0') {
            indexnav = 0;
            page = 0;
        } else {
            if (indexskip === '+') {
                indexnav += pagesize;
                page += 1;
            } else {
                if (indexskip === '-') {
                    indexnav -= pagesize;
                    page += -1;
                }
            }
        }
        res.redirect('/search/' + searchData[0] + '/' + searchData[1]);
    };

    var postYear = function (req, res) {
        indexnav = 0;
        page = 0;
        var searchData = req.body.year;
        res.redirect('/search/year/' + searchData);
    };

    var postText = function (req, res) {
        indexnav = 0;
        page = 0;
        var searchData = req.body.text;
        res.redirect('/search/text/' + searchData);
    };

    var getYear = function (req, res) {
        var year = req.params.id;
        var url = 'mongodb://localhost:27017/library';
        mongodb.connect(url, function(err, db) {
            var collection = db.collection('IvanPhotos');
            var photocount = 0;
            var isMovie = false;
            collection.findOne({year: year, mediaType: 'video'}, function(err, results) {
                if (results) {
                    // Test for movies and remove them but set the flag
                    isMovie = true;
                }
                collection.count({year: year, mediaType: 'photo'}, function(err, results) {
                    photocount = results;
                    collection.find({year: year, mediaType: 'photo'}).sort({exifdate: 1, filename: 1})
                        .limit(pagesize).skip(indexnav).toArray(function(err, results) {
                        if (results && results[0] !== undefined) {
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
                                            var themeid = localbasenav.indexOf(results[j].theme);
                                            results[j].theme = basenav[themeid];
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
                                res.render('search',  {stype: 'year&' + year, results: results,
                                            pagesize: pagesize, indexnav: indexnav, photoend: photoend,
                                            isMovie: isMovie, title: 'Search Year: ' + year, page: page,
                                            total: Math.floor(photocount / pagesize) + 1, vtype: 'year/' + year
                                            });
                                db.close();
                            }
                        } else {
                            res.render('search', {stype: '', results: [],
                                            pagesize: pagesize, indexnav: 0, photoend: true,
                                            isMovie: false, title: 'No photo for: ' + year, page: -1,
                                            total: 0, vtype: ''});
                            db.close();
                        }
                    });
                });
            });
        });
    };

    var getText = function (req, res) {
        var text = req.params.id;
        var url = 'mongodb://localhost:27017/library';
        mongodb.connect(url, function(err, db) {
            var collection = db.collection('IvanPhotos');
            var photocount = 0;
            var isMovie = false;
            collection.findOne({$text:{$search: text}, mediaType: 'video'}, function(err, results) {
                if (results) {
                    // Test for movies and remove them but set the flag
                    isMovie = true;
                }
                collection.count({$text:{$search: text}, mediaType: 'photo'}, function(err, results) {
                    photocount = results;
                    collection.find({$text:{$search: text}, mediaType: 'photo'}).sort({exifdate: 1, filename: 1})
                        .limit(pagesize).skip(indexnav).toArray(function(err, results) {
                        if (results && results[0] !== undefined) {
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
                                            var themeid = localbasenav.indexOf(results[j].theme);
                                            results[j].theme = basenav[themeid];
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
                                res.render('search',{stype: 'text&' + text, results: results,
                                            pagesize: pagesize, indexnav: indexnav, photoend: photoend,
                                            isMovie: isMovie, title: 'Search Text: ' + text, page: page,
                                            total: Math.floor(photocount / pagesize) + 1, vtype: 'text/' + text
                                            });
                                db.close();
                            }
                        } else {
                            res.render('search', {stype: '', results: [],
                                            pagesize: pagesize, indexnav: 0, photoend: true,
                                            isMovie: false, title: 'No photo for: ' + text, page: -1,
                                            total: 0, vtype: ''});
                            db.close();
                        }
                    });
                });
            });
        });
    };

    var showVideoYear = function (req, res) {
        var year = req.params.id;
        var url = 'mongodb://localhost:27017/library';
        mongodb.connect(url, function(err, db) {
            var collection = db.collection('IvanPhotos');
            var photocount = 0;
            collection.count({year: year}, function(err, results) {
                photocount = results;
            });
            collection.find({year: year, mediaType: 'video'}).sort({exifdate: 1, filename: 1}).toArray(function(err, results) {
                if (results) {
                    for (var j = 0; j < results.length; j++) {
                        var themeid = localbasenav.indexOf(results[j].theme);
                        results[j].theme = basenav[themeid];
                    }
                    //  check if we are at the end of the folder
                    var photoend = true;
                    res.render('searchvideos',  {results: results,
                                pagesize: pagesize, indexnav: indexnav, photoend: photoend, page: 0,
                                total: 1, title: 'Videos for Year: ' + year, ptype: 'year/' + year
                                });
                    db.close();
                }
            });
        });
    };

    var showVideoText = function (req, res) {
        var text = req.params.id;
        var url = 'mongodb://localhost:27017/library';
        mongodb.connect(url, function(err, db) {
            var collection = db.collection('IvanPhotos');
            var photocount = 0;
            collection.count({$text:{$search: text}}, function(err, results) {
                photocount = results;
            });
            collection.find({$text:{$search: text}, mediaType: 'video'}).sort({exifdate: 1, filename: 1}).toArray(function(err, results) {
                if (results) {
                    for (var j = 0; j < results.length; j++) {
                        var themeid = localbasenav.indexOf(results[j].theme);
                        results[j].theme = basenav[themeid];
                    }
                    //  check if we are at the end of the folder
                    var photoend = true;
                    res.render('searchvideos',  {results: results,
                                pagesize: pagesize, indexnav: indexnav, photoend: photoend, page: 0,
                                total: 1, title: 'Videos for Text: ' + text, ptype: 'text/' + text
                                });
                    db.close();
                }
            });
        });
    };

    return {
        getEmpty: getEmpty,
        getYear: getYear,
        getText: getText,
        postYear: postYear,
        postText: postText,
        getSkipIndex: getSkipIndex,
        showVideoYear: showVideoYear,
        showVideoText: showVideoText,
        middleware: middleware
    };
};

module.exports = searchController;