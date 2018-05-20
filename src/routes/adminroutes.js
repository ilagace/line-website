var express = require('express');

var mongodb = require('mongodb').MongoClient;

var adminrouter = express.Router();

var passport = require('passport');

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {
    console.log(req.isAuthenticated());
    // if user is authenticated in the session, carry on
    if (req.isAuthenticated()) {
        return next();
    }
    // if they aren't redirect them to the signin page
    res.render('signin');
}

var GoogleMapsAPI = require('googlemaps');

var iconv = require('iconv-lite');

var imagetype = ['.jpg', 'JPG','.bmp','m4v','avi','mov','MOV','mp4','MP4'];

var isNewFolder = false;
var urlParam = '';

var router = function(basenav, localbasenav, category, io) {

    //  To do a walkthrough of all the photos for my web site
    var walk = require('walk'),
        options, walker;

    options = {
        followLinks: false,
        // directories with these keys will be skipped                 ,
        filters: ['thumb']
    };

    //  Allow only the owner to the Admin pages
    adminrouter.route('/signin').post(passport.authenticate('local',
            {failureRedirect: '/line', successRedirect: '/line/admin/managemedia'}));

    adminrouter.route('/signin').get(isLoggedIn, function(req, res) {
        res.redirect('/line/admin/managemedia');
    });

    //  Angular will handle the data for the page by calling /managemedia and eventually /searchmedia
    adminrouter.route('/managemedia').get(isLoggedIn, function(req, res) {
        res.render('managemedia');
    });

    //  Post request from angular to save Category in DB
    adminrouter.route('/setCategory').post(function(req, res) {
        var url = 'mongodb://localhost:27017/library';
        mongodb.connect(url, function(err,db) {
            var collection = db.collection('LinePhotos');
            var dirSplit = req.body.photo.split('/');
            collection.updateOne({theme: localbasenav[basenav.indexOf(dirSplit[2])], folder: dirSplit[3], filename: dirSplit[4]},
                                 {$set: {category: req.body.category, description: req.body.description}}, function(err) {
                                    console.log(dirSplit, req.body.category, req.body.description);
                                    db.close();
                                    res.send({result:'success'});
                                });
        });
    });

    //  Angular will handle the data for the page by calling /searchfolder
    adminrouter.route('/searchmedia/:id').get(function(req, res) {
        if (req.params.id === '1') {
            isNewFolder = true;
        } else {
            isNewFolder = false;
        }
        res.render('searchmedia');
    });

    adminrouter.route('/mediadata').get(function(req, res) {
        var movietype = ['.avi', 'mp4','.MOV','mov'];
        var photoArray = {};
        var folderList = {};
        var pkey = '';
        var url = 'mongodb://localhost:27017/library';
        mongodb.connect(url, function(err,db) {
            var collection = db.collection('LinePhotos');
            collection.find({},{theme:1, folder:1, filename:1, category:1, description:1}).sort({theme:1}).toArray(function(err, results) {
                if (results) {
                    io.emit('console', 'Start reading media in DB \nNumber of photos = ' + String(results.length));
                    var prevtheme = results[0].theme;
                    var prevfolder = '';
                    var photoSet = [];
                    var folderSet = [];
                    for (var i = 0; i < results.length; i++) {
                        if (results[i].filename === undefined) {
                            console.log(results[i]);
                        }
                        if (i % 1000 === 0) {
                            io.emit('console', 'Processing number: ' + String(i));
                        }
                        if (results[i].theme !== prevtheme || results[i].folder !== prevfolder) {
                            if (results[i].theme !== prevtheme) {
                                folderList[basenav[localbasenav.indexOf(prevtheme)]] = folderSet;
                                folderSet = [];
                            }
                            folderSet.push(results[i].folder);
                            prevtheme = results[i].theme;
                            prevfolder = results[i].folder;
                            pkey = basenav[localbasenav.indexOf(results[i].theme)] + results[i].folder;
                            photoSet = [];
                        }
                        // Do not include movies here
                        var typetest = false;
                        if (results[i].filename !== undefined) {
                            for (var j = 0; j < movietype.length; j++) {
                                typetest = typetest || results[i].filename.indexOf(movietype[j]) !== -1;
                            }
                        }
                        if (!typetest) {
                            photoSet.push(['/assets/' + basenav[localbasenav.indexOf(results[i].theme)] + '/' +
                                results[i].folder + '/' + results[i].filename, results[i].category, results[i].description]);
                        }
                        photoArray[pkey] = photoSet.sort();
                    }
                    folderList[basenav[localbasenav.indexOf(prevtheme)]] = folderSet.sort();
                    db.close();
                    res.json({basenav: basenav, category: category, photoArray: photoArray, folderList: folderList});
                }
            });
        });
    });

    adminrouter.route('/searchfolder').get(function(req, res, next) {
        if (isNewFolder) {
            res.redirect('/line/admin/searchnew');
        } else {
            res.redirect('/line/admin/searchold');
        }
    });

    adminrouter.route('/searchold').get(function(req, res, next) {

        console.log('search being called...please wait');
        io.emit('console', 'search being called...please wait');
        var photocounter = 0;
        var totalCount = 0;
        var findErrorNum = 0;
        var recordCheck = 0;
        var recordFound = 0;
        var walkerEnd = false;

        var photoArray = {};
        var folderList = {};
        var photoList = [];
        var photoSet = '';
        var pkey = '';

        // Do not check for movies
        var phototype = ['.jpg', 'JPG','.bmp'];

        var url = 'mongodb://localhost:27017/library';
        mongodb.connect(url, function(err,db) {
            var collection = db.collection('LinePhotos');

            //  Wait until all callback are finished before closing
            function oncomplete() {
                if (totalCount === (recordCheck - recordFound - findErrorNum)) {
                    console.log('A total of ' + totalCount + ' records were added and ' + recordCheck + ' records checked.');
                    io.emit('console', 'A total of ' + String(totalCount) + ' records were added and ' + String(recordCheck) + ' records checked.');
                    db.close();
                    for (var j = 0; j <= 5; j++) {
                        folderList[basenav[j]] = [];
                    }
                    for (var i = 0; i < photoList.length; i++) {
                        pkey = photoList[i].theme + ',' + photoList[i].folder;
                        photoSet = '/assets/' + photoList[i].theme + '/' +
                            photoList[i].folder + '/' + photoList[i].filename;
                        if (folderList[photoList[i].theme].indexOf(photoList[i].folder) === -1) {
                            folderList[photoList[i].theme].push(photoList[i].folder);
                        }
                        if (photoArray[pkey] === undefined) {
                            photoArray[pkey] = [photoSet];
                        } else {
                            photoArray[pkey].push(photoSet);
                        }
                    }
                    res.json({basenav: basenav, photoArray: photoArray, folderList: folderList});
                } else {
                    if (totalCount % 1000 === 0) {
                        io.emit('console', 'A total of ' + String(totalCount) + ' records were processed');
                    }
                    return;
                }
            }

            walker = walk.walk('D:\\Web', options);

            walker.on('directories', function(root, dirStatsArray, next) {
                // dirStatsArray is an array of `stat` objects with the additional attributes
                // * type
                // * error
                // * name
                next();
            });

            walker.on('file', function(root, fileStats, next) {
                //  check for images
                var typetest = false;
                for (var i = 0; i < phototype.length; i++) {
                    typetest = typetest || fileStats.name.indexOf(phototype[i]) !== -1;
                }
                //  All images are kept in the v8x6 folder
                if (root.indexOf('v8x6') !== -1 && typetest) {
                    var dirSplit = root.split('\\');
                    var fork = '';
                    if (dirSplit[2].indexOf('2') !== -1) {
                        fork = ' 2';
                    }
                    var path = 'file:///d:/' + 'Web Photos\/my photos' + fork + '\/' + dirSplit[3] +  '\/' + dirSplit[4] +  '\/' + fileStats.name;
                    var basetheme = basenav[localbasenav.indexOf(dirSplit[3])];
                    recordCheck += 1;
                    collection.findOne({theme: dirSplit[3], folder: dirSplit[4], subfolder: dirSplit[5], filename: fileStats.name}, function(err, results) {
                        if (err) {
                            findErrorNum += 1;
                            console.log('error when looking up: ',fileStats.name);
                            io.emit('console', 'error when looking up: ' + fileStats.name);
                            if (walkerEnd) {
                                oncomplete();
                            }
                        }
                        if (!results) {
                            photoList.push({theme: basetheme, folder: dirSplit[4], filename: fileStats.name});
                            totalCount += 1;
                            if (walkerEnd) {
                                oncomplete();
                            }
                        } else {
                            recordFound += 1;
                            if (walkerEnd) {
                                oncomplete();
                            }
                        }
                    });
                }
                next();
            });

            walker.on('errors', function(root, nodeStatsArray, next) {
                next();
            });

            walker.on('end', function() {
                console.log('folder walk completed with ',recordCheck, ' records checked, records found: ',recordFound,
                 ' and records added: ',totalCount);
                io.emit('console', 'folder walk completed with ' + String(recordCheck) + ' records checked, records found: ' +
                    String(recordFound) + ' and records added: ' + String(totalCount));
                walkerEnd = true;
                oncomplete();
            });
        });
    });

    adminrouter.route('/searchnew').get(function(req, res) {

        console.log('new photos search being called...please wait');
        var photocounter = 0;
        var totalCount = 0;
        var findErrorNum = 0;
        var recordCheck = 0;
        var recordFound = 0;
        var walkerEnd = false;

        var photoArray = {};
        var folderList = {};
        var photoList = [];
        var pkey = '';

        // Do not check for movies
        var phototype = ['.jpg', 'JPG','.bmp'];

        var url = 'mongodb://localhost:27017/library';
        mongodb.connect(url, function(err,db) {
            var collection = db.collection('LinePhotos');

            //  Wait until all callback are finished before closing
            function oncomplete() {
                if (totalCount === (recordCheck - recordFound - findErrorNum)) {
                    console.log('A total of ' + totalCount + ' records were added and ' + recordCheck + ' records checked.');
                    io.emit('console', 'A total of ' + String(totalCount) + ' records were added and ' + String(recordCheck) + ' records checked.');
                    db.close();
                    if (photoList.length !== 0) {
                        // The list must be sorted first for the module to work
                        photoList.sort(function(a,b) {return (a.theme + a.folder > b.theme + b.folder) ? 1 : ((b.theme + b.folder > a.theme + a.folder) ? -1 : 0);});
                        var prevtheme = photoList[0].theme;
                        var prevfolder = '';
                        var photoSet = [];
                        var folderSet = [];
                        for (var i = 0; i < photoList.length; i++) {
                            if (photoList[i].theme !== prevtheme || photoList[i].folder !== prevfolder) {
                                if (photoList[i].theme !== prevtheme) {
                                    folderList[prevtheme] = folderSet;
                                    folderSet = [];
                                }
                                folderSet.push(photoList[i].folder);
                                prevtheme = photoList[i].theme;
                                prevfolder = photoList[i].folder;
                                pkey = photoList[i].theme + ',' + photoList[i].folder;
                                photoSet = [];
                            }
                            photoSet.push('/assets/' + photoList[i].theme + '/' +
                                photoList[i].folder + '/' + photoList[i].filename);
                            photoArray[pkey] = photoSet.sort();
                        }
                        folderList[prevtheme] = folderSet.sort();
                    } else {
                        console.log('No new folders found');
                        io.emit('console','No new folders found');
                    }
                    res.json({basenav: basenav, photoArray: photoArray, folderList: folderList});
                } else {
                    if (totalCount % 1000 === 0) {
                        io.emit('console', 'A total of ' + String(totalCount) + ' records were processed');
                    }
                    return;
                }
            }

            walker = walk.walk('/home/ec2-user/Web New Photos', options);

            walker.on('directories', function(root, dirStatsArray, next) {
                // dirStatsArray is an array of `stat` objects with the additional attributes
                // * type
                // * error
                // * name
                next();
            });

            walker.on('file', function(root, fileStats, next) {
                //  check for images
                var typetest = false;
                for (var i = 0; i < phototype.length; i++) {
                    typetest = typetest || fileStats.name.indexOf(phototype[i]) !== -1;
                }
                //  All images are kept in the v8x6 folder
                if (typetest) {
                    var dirSplit = root.split('/');
                    var path = root + '/' + fileStats.name;
                    var basetheme = basenav[localbasenav.indexOf(dirSplit[2])];
                    recordCheck += 1;
                    collection.findOne({theme: dirSplit[2], folder: dirSplit[3], subfolder: null, filename: fileStats.name}, function(err, results) {
                        if (err) {
                            findErrorNum += 1;
                            console.log('error when looking up: ',fileStats.name);
                            io.emit('console', 'error when looking up: ' + fileStats.name);
                            if (walkerEnd) {
                                oncomplete();
                            }
                        }
                        if (!results) {
                            photoList.push({theme: basetheme, folder: dirSplit[3], filename: fileStats.name});
                            totalCount += 1;
                            if (walkerEnd) {
                                oncomplete();
                            }
                        } else {
                            recordFound += 1;
                            if (walkerEnd) {
                                oncomplete();
                            }
                        }
                    });
                }
                next();
            });

            walker.on('errors', function(root, nodeStatsArray, next) {
                next();
            });

            walker.on('end', function() {
                console.log('folder walk completed with ',recordCheck, ' records checked, records found: ',recordFound, ' and records added: ',totalCount);
                io.emit('console', 'folder walk completed with ' + String(recordCheck) + ' records checked, records found: ' +
                    String(recordFound) + ' and records added: ' + String(totalCount));
                walkerEnd = true;
                oncomplete();
            });
        });
    });

    adminrouter.route('/addphotos/:id').get(function(req, res) {
        //  Need a workaround when I have a french accent in parameters which disallow the redirect (a patch)
        if (req.params.id.indexOf('é') !== -1) {
            urlParam = req.params.id;
            if (isNewFolder) {
                res.redirect('/line/admin/addnew/0');
            } else {
                res.redirect('/line/admin/addold/0');
            }
        } else {
            if (isNewFolder) {
                res.redirect('/line/admin/addnew/' + req.params.id);
            } else {
                res.redirect('/line/admin/addold/' + req.params.id);
            }
        }
    });

    adminrouter.route('/addold/:id').get(function(req, res) {

        //  To read the exif data on most recent photos
        var ExifImage = require('exif').ExifImage;

        // To read the txt file with description
        var fs = require('fs');

        //  Setup Google Maps API
        var publicConfig = {
            key: 'AIzaSyAhPi1zmHW0g3PdQgTs9rcO-3FweDPiT-U',
        };
        var gmAPI = new GoogleMapsAPI(publicConfig);

        //  Google Maps reverse geocode API
        var reverseGeocodeParams = {
            'latlng':        '0,0',
            'language':      'en'
        };

        //  Build an array of data for each photos on the web site
        var photocounter = 0;
        var totalCount = 0;
        var findErrorNum = 0;
        var recordCheck = 0;
        var recordFound = 0;
        var walkerEnd = false;

        var folderStart = '';
        if (req.params.id === '0') {
            folderStart = urlParam;
        } else {
            folderStart = req.params.id;
        }
        var pathSplit = folderStart.split(',');
        var fork = '';
        if (pathSplit[0].indexOf('Vieilles') !== -1) {
            fork = ' 2';
        }
        var pathStart = 'D:\\Web\\Web site' + fork + '\\' + localbasenav[basenav.indexOf(pathSplit[0])] + '\\' + pathSplit[1];

        //  Here is the database
        var url = 'mongodb://localhost:27017/library';
        mongodb.connect(url, function(err,db) {
            var collection = db.collection('LinePhotos');

            //  Wait until all callback are finished before closing
            function oncomplete() {
                if (totalCount < (recordCheck - recordFound - findErrorNum) || photocounter !== 0) {
                    if (totalCount % 100 === 0) {
                        console.log('A total of ' + totalCount + ' records were added and ' + recordCheck + ' records checked.');
                        io.emit('console', 'A total of ' + String(totalCount) + ' records were added and ' + String(recordCheck) + ' records checked.');
                    }
                    return;
                } else {
                    console.log('A total of ' + totalCount + ' records were added and ' + recordCheck + ' records checked.');
                    io.emit('console', 'A total of ' + String(totalCount) + ' records were added and ' + String(recordCheck) + ' records checked.');
                    db.close();
                    res.redirect('/');
                }
            }

            //  This code is meant to be run on the local machine to update the database and then copy the database to the web server
            //  because the subfolders exists only on the local machine

            walker = walk.walk(pathStart, options);

            walker.on('directories', function(root, dirStatsArray, next) {
                // dirStatsArray is an array of `stat` objects with the additional attributes
                // * type
                // * error
                // * name
                next();
            });

            walker.on('file', function(root, fileStats, next) {
                //  check for images
                var typetest = false;
                for (var i = 0; i < imagetype.length; i++) {
                    typetest = typetest || fileStats.name.indexOf(imagetype[i]) !== -1;
                }
                //  All images are kept in the v8x6 folder
                if (root.indexOf('v8x6') !== -1 && typetest) {
                    var dirSplit = root.split('\\');
                    var fork = '';
                    if (dirSplit[5].length >= 35) {
                        console.log('Subfolder name is too long', dirSplit[5]);
                        io.emit('console','Subfolder name is too long ' + dirSplit[5]);
                    }
                    if (dirSplit[3].indexOf('2') !== -1) {
                        fork = ' 2';
                    }
                    var path = dirSplit[0] +  '\\' + 'Web Photos\\my photos' + fork + '\\' + dirSplit[3] +  '\\' + dirSplit[4] +  '\\' + fileStats.name;

                    // Check for movies
                    var mediaType = 'photo';
                    var text = null;
                    if (fileStats.name.indexOf('m4v') !== -1 || fileStats.name.indexOf('avi') !== -1  ||
                            fileStats.name.indexOf('mov') !== -1 || fileStats.name.indexOf('MOV') !== -1) {
                        mediaType = 'video';
                    } else {
                        // Get the text for the description if it exists
                        var pathtxt = root.slice(0,root.indexOf(dirSplit[5])) +
                                    fileStats.name.slice(0,fileStats.name.indexOf('.')) +
                                    '.txt';

                        if (fs.existsSync(pathtxt)) {
                            //  Text files are encoded in latin-1 aka ISO-8859-1
                            var binary = String(fs.readFileSync(pathtxt, {encoding: 'binary'}));
                            text = iconv.decode(binary, 'ISO-8859-1');
                            if (text.includes('Aucune description')) {
                                text = null;
                            } else {
                                var nextline = text.indexOf('\n');
                                if (nextline !== -1) {
                                    text = text.slice(0,nextline);
                                }
                            }
                            //  generated an error recently after moving DB opening above???  Works OK without fs.close() now
                            //  fs.close();
                        }
                    }
                    // We are now inside the image folder and we check first if photo/video already in database
                    recordCheck += 1;
                    collection.findOne({theme: dirSplit[3], folder: dirSplit[4], subfolder: dirSplit[5], filename: fileStats.name}, function(err, results) {
                        if (err) {
                            findErrorNum += 1;
                            console.log('error when looking up: ',fileStats.name);
                            io.emit('console', 'error when looking up: ' + fileStats.name);
                            recordFound += 1;
                            if (walkerEnd) {
                                oncomplete();
                            }
                        }
                        if (!results) {
                            // if not in database build the complete data record
                            photocounter += 1;
                            try {
                                var exifStat = new ExifImage({image : path}, function (error, exifData) {
                                    if (error) {
                                        // Look up the media year in folder name if no exif
                                        var yearind99 = dirSplit[4].indexOf(' 19');
                                        var yearind20 = dirSplit[4].indexOf(' 20');
                                        var yeardata = '1900';
                                        if (yearind99 !== -1) {
                                            yeardata = dirSplit[4].substring(yearind99 + 1,yearind99 + 5);
                                        }
                                        if (yearind20 !== -1) {
                                            yeardata = dirSplit[4].substring(yearind20 + 1,yearind20 + 5);
                                        }
                                        var datanoexif = {};
                                        if (mediaType === 'video') {
                                            datanoexif = {theme: dirSplit[3],
                                                        folder: dirSplit[4],
                                                        subfolder: dirSplit[5],
                                                        filename: fileStats.name.replace('.m4v','.mp4').replace('.avi','.mp4'),
                                                        description: text,
                                                        weblink: null,
                                                        exifDate: null,
                                                        year: yeardata,
                                                        photoDimW: null,
                                                        photoDimH: null,
                                                        camera: 'Video',
                                                        gpsLatRef: null,
                                                        gpsLat: null,
                                                        gpsLongRef: null,
                                                        gpsLong: null,
                                                        reverseGeo: null,
                                                        mediaType: mediaType,
                                                        category: null
                                                        };
                                        } else {
                                            // No exif data, get image size using image-size module
                                            var sizeOf = require('image-size');
                                            var dimensions = sizeOf(path);
                                            var fsmtime = JSON.stringify(fileStats.mtime);
                                            datanoexif = {theme: dirSplit[3],
                                                        folder: dirSplit[4],
                                                        subfolder: dirSplit[5],
                                                        filename: fileStats.name,
                                                        description: text,
                                                        weblink: null,
                                                        exifDate: fsmtime.slice(1,11) + ' ' + fsmtime.slice(12,20),
                                                        year: yeardata,
                                                        photoDimW: dimensions.width,
                                                        photoDimH: dimensions.height,
                                                        camera: 'Scanned',
                                                        gpsLatRef: null,
                                                        gpsLat: null,
                                                        gpsLongRef: null,
                                                        gpsLong: null,
                                                        reverseGeo: null,
                                                        mediaType: mediaType,
                                                        category: null
                                                        };
                                        }
                                        collection.insertOne(datanoexif, function(err, result) {
                                            photocounter -= 1;
                                            totalCount += 1;
                                            if (walkerEnd) {
                                                oncomplete();
                                            }
                                        });
                                    } else {
                                        // We have some exif data here
                                        var yearexif = 2000;
                                        if (typeof exifData.exif.DateTimeOriginal !== 'undefined') {
                                            yearexif = exifData.exif.DateTimeOriginal.slice(0,4);
                                        }
                                        var dataexif = {theme: dirSplit[3],
                                                folder: dirSplit[4],
                                                subfolder: dirSplit[5],
                                                filename: fileStats.name,
                                                description: text,
                                                weblink: null,
                                                exifDate: exifData.exif.DateTimeOriginal,
                                                year: yearexif,
                                                photoDimW: exifData.exif.ExifImageWidth,
                                                photoDimH: exifData.exif.ExifImageHeight,
                                                camera: exifData.image.Model,
                                                gpsLatRef: exifData.gps.GPSLatitudeRef,
                                                gpsLat: exifData.gps.GPSLatitude,
                                                gpsLongRef: exifData.gps.GPSLongitudeRef,
                                                gpsLong: exifData.gps.GPSLongitude,
                                                reverseGeo: null,
                                                mediaType: 'photo',
                                                category: null
                                        };
                                        //  Now do a Google Maps reverse Geocode to get approximate address
                                        if (dataexif.gpsLat) {
                                            var latstr = dataexif.gpsLat.slice(',');
                                            var latfloat = parseInt(latstr[0]) + parseInt(latstr[1]) / 60 + parseInt(latstr[2]) / 3600;
                                            var longstr = dataexif.gpsLong.slice(',');
                                            var longfloat = parseInt(longstr[0]) + parseInt(longstr[1]) / 60 + parseInt(longstr[2]) / 3600;
                                            if (dataexif.gpsLatRef === 'S') {
                                                latfloat = -latfloat;
                                            }
                                            if (dataexif.gpsLongRef === 'W') {
                                                longfloat = -longfloat;
                                            }
                                            reverseGeocodeParams.latlng = latfloat + ',' + longfloat;
                                            gmAPI.reverseGeocode(reverseGeocodeParams, function(err, gpsresult) {
                                                if (!err && gpsresult.status === 'OK') {
                                                    dataexif.reverseGeo = 'GPS:' + gpsresult.results[0].formatted_address;
                                                }
                                                collection.insertOne(dataexif, function(err, result) {
                                                    photocounter -= 1;
                                                    totalCount += 1;
                                                    if (walkerEnd) {
                                                        oncomplete();
                                                    }
                                                });
                                            });
                                        } else {
                                            collection.insertOne(dataexif, function(err, result) {
                                                photocounter -= 1;
                                                totalCount += 1;
                                                if (walkerEnd) {
                                                    oncomplete();
                                                }
                                            });
                                        }
                                    }
                                });
                            } catch (error) {
                                console.log('Error try: ' + error.message);
                                io.emit('console', 'Error try: ' + error.message);
                            }
                        } else {
                            recordFound += 1;
                            if (walkerEnd) {
                                oncomplete();
                            }
                        }
                    });
                }
                next();
            });

            walker.on('errors', function(root, nodeStatsArray, next) {
                next();
            });

            walker.on('end', function() {
                console.log('folder walk completed with ',recordCheck, ' records checked, records found: ',recordFound, ' and records added: ',totalCount);
                io.emit('console', 'folder walk completed with ' + String(recordCheck) + ' records checked, records found: ' +
                    String(recordFound) + ' and records added: ' + String(totalCount));
                walkerEnd = true;
                oncomplete();
            });
        });
    });

    adminrouter.route('/addnew/:id').get(function(req, res) {

        //  To read the exif data on most recent photos
        var ExifImage = require('exif').ExifImage;

        // To read the txt file with description
        var fs = require('fs');

        //  Setup Google Maps API
        var publicConfig = {
            key: 'AIzaSyAhPi1zmHW0g3PdQgTs9rcO-3FweDPiT-U',
        };
        var gmAPI = new GoogleMapsAPI(publicConfig);

        //  Google Maps reverse geocode API
        var reverseGeocodeParams = {
            'latlng':        '0,0',
            'language':      'en'
        };

        //  Build an array of data for each photos on the web site
        var photocounter = 0;
        var totalCount = 0;
        var findErrorNum = 0;
        var recordCheck = 0;
        var recordFound = 0;
        var walkerEnd = false;

        var folderStart = '';
        if (req.params.id === '0') {
            folderStart = urlParam;
        } else {
            folderStart = req.params.id;
        }
        var pathSplit = folderStart.split(',');
        var pathStart = '/home/ec2-user/Web New Photos' + '/' + localbasenav[basenav.indexOf(pathSplit[0])] + '/' + pathSplit[1];

        //  Here is the database
        var url = 'mongodb://localhost:27017/library';
        mongodb.connect(url, function(err,db) {
            var collection = db.collection('LinePhotos');

            //  Wait until all callback are finished before closing
            function oncomplete() {
                if (totalCount < (recordCheck - recordFound - findErrorNum) || photocounter !== 0) {
                    if (totalCount % 100 === 0) {
                        console.log('A total of ' + totalCount + ' records were added and ' + recordCheck + ' records checked.');
                        io.emit('console', 'A total of ' + String(totalCount) + ' records were added and ' + String(recordCheck) + ' records checked.');
                    }
                    return;
                } else {
                    console.log('A total of ' + totalCount + ' records were added and ' + recordCheck + ' records checked.');
                    io.emit('console', 'A total of ' + String(totalCount) + ' records were added and ' + String(recordCheck) + ' records checked.');
                    db.close();
                    res.redirect('/');
                }
            }

            //  This code is meant to be run on the local machine to update the database and then copy the database to the web server
            //  because the subfolders exists only on the local machine

            walker = walk.walk(pathStart, options);

            walker.on('directories', function(root, dirStatsArray, next) {
                // dirStatsArray is an array of `stat` objects with the additional attributes
                // * type
                // * error
                // * name
                next();
            });

            walker.on('file', function(root, fileStats, next) {
                //  check for images
                var typetest = false;
                for (var i = 0; i < imagetype.length; i++) {
                    typetest = typetest || fileStats.name.indexOf(imagetype[i]) !== -1;
                }
                if (typetest) {
                    var dirSplit = root.split('/');
                    var path = pathStart + '/' + fileStats.name;
                    // Check for movies
                    var mediaType = 'photo';
                    var text = null;
                    if (fileStats.name.indexOf('MOV') !== -1 || fileStats.name.indexOf('mov') !== -1 ||
                        fileStats.name.indexOf('MP4') !== -1 || fileStats.name.indexOf('mp4') !== -1) {
                        mediaType = 'video';
                    }
                    // We are now inside the image folder and we check first if photo/video already in database
                    recordCheck += 1;
                    collection.findOne({theme: dirSplit[2], folder: dirSplit[3], subfolder: null, filename: fileStats.name}, function(err, results) {
                        if (err) {
                            findErrorNum += 1;
                            console.log('error when looking up: ',fileStats.name);
                            io.emit('console', 'error when looking up: ' + fileStats.name);
                            recordFound += 1;
                            if (walkerEnd) {
                                oncomplete();
                            }
                        }
                        if (!results) {
                            // if not in database build the complete data record
                            photocounter += 1;
                            try {
                                var exifStat = new ExifImage({image : path}, function (error, exifData) {
                                    if (error) {
                                        // Look up the media year in folder name if no exif
                                        var yearind99 = dirSplit[3].indexOf(' 19');
                                        var yearind20 = dirSplit[3].indexOf(' 20');
                                        var yeardata = '1900';
                                        if (yearind99 !== -1) {
                                            yeardata = dirSplit[3].substring(yearind99 + 1,yearind99 + 5);
                                        }
                                        if (yearind20 !== -1) {
                                            yeardata = dirSplit[3].substring(yearind20 + 1,yearind20 + 5);
                                        }
                                        var datanoexif = {};
                                        if (mediaType === 'video') {
                                            datanoexif = {theme: dirSplit[2],
                                                        folder: dirSplit[3],
                                                        subfolder: null,
                                                        filename: fileStats.name,
                                                        description: text,
                                                        weblink: null,
                                                        exifDate: null,
                                                        year: yeardata,
                                                        photoDimW: null,
                                                        photoDimH: null,
                                                        camera: 'Video',
                                                        gpsLatRef: null,
                                                        gpsLat: null,
                                                        gpsLongRef: null,
                                                        gpsLong: null,
                                                        reverseGeo: null,
                                                        mediaType: mediaType,
                                                        category: null
                                                        };
                                        } else {
                                            // No exif data, get image size using image-size module
                                            var sizeOf = require('image-size');
                                            var dimensions = sizeOf(path);
                                            var fsmtime = JSON.stringify(fileStats.mtime);
                                            datanoexif = {theme: dirSplit[2],
                                                        folder: dirSplit[3],
                                                        subfolder: null,
                                                        filename: fileStats.name,
                                                        description: text,
                                                        weblink: null,
                                                        exifDate: fsmtime.slice(1,11) + ' ' + fsmtime.slice(12,20),
                                                        year: yeardata,
                                                        photoDimW: dimensions.width,
                                                        photoDimH: dimensions.height,
                                                        camera: 'Scanned',
                                                        gpsLatRef: null,
                                                        gpsLat: null,
                                                        gpsLongRef: null,
                                                        gpsLong: null,
                                                        reverseGeo: null,
                                                        mediaType: mediaType,
                                                        category: null
                                                        };
                                        }
                                        collection.insertOne(datanoexif, function(err, result) {
                                            photocounter -= 1;
                                            totalCount += 1;
                                            if (walkerEnd) {
                                                oncomplete();
                                            }
                                        });
                                    } else {
                                        // We have some exif data here
                                        var yearexif = 2000;
                                        if (typeof exifData.exif.DateTimeOriginal !== 'undefined') {
                                            yearexif = exifData.exif.DateTimeOriginal.slice(0,4);
                                        }
                                        var dataexif = {theme: dirSplit[2],
                                                folder: dirSplit[3],
                                                subfolder: null,
                                                filename: fileStats.name,
                                                description: text,
                                                weblink: null,
                                                exifDate: exifData.exif.DateTimeOriginal,
                                                year: yearexif,
                                                photoDimW: exifData.exif.ExifImageWidth,
                                                photoDimH: exifData.exif.ExifImageHeight,
                                                camera: exifData.image.Model,
                                                gpsLatRef: exifData.gps.GPSLatitudeRef,
                                                gpsLat: exifData.gps.GPSLatitude,
                                                gpsLongRef: exifData.gps.GPSLongitudeRef,
                                                gpsLong: exifData.gps.GPSLongitude,
                                                reverseGeo: null,
                                                mediaType: 'photo',
                                                category: null
                                        };
                                        //  Now do a Google Maps reverse Geocode to get approximate address
                                        if (dataexif.gpsLat) {
                                            var latstr = dataexif.gpsLat.slice(',');
                                            var latfloat = parseInt(latstr[0]) + parseInt(latstr[1]) / 60 + parseInt(latstr[2]) / 3600;
                                            var longstr = dataexif.gpsLong.slice(',');
                                            var longfloat = parseInt(longstr[0]) + parseInt(longstr[1]) / 60 + parseInt(longstr[2]) / 3600;
                                            if (dataexif.gpsLatRef === 'S') {
                                                latfloat = -latfloat;
                                            }
                                            if (dataexif.gpsLongRef === 'W') {
                                                longfloat = -longfloat;
                                            }
                                            reverseGeocodeParams.latlng = latfloat + ',' + longfloat;
                                            gmAPI.reverseGeocode(reverseGeocodeParams, function(err, gpsresult) {
                                                if (!err && gpsresult.status === 'OK') {
                                                    dataexif.reverseGeo = 'GPS:' + gpsresult.results[0].formatted_address;
                                                }
                                                collection.insertOne(dataexif, function(err, result) {
                                                    photocounter -= 1;
                                                    totalCount += 1;
                                                    if (walkerEnd) {
                                                        oncomplete();
                                                    }
                                                });
                                            });
                                        } else {
                                            collection.insertOne(dataexif, function(err, result) {
                                                photocounter -= 1;
                                                totalCount += 1;
                                                if (walkerEnd) {
                                                    oncomplete();
                                                }
                                            });
                                        }
                                    }
                                });
                            } catch (error) {
                                console.log('Error try: ' + error.message);
                                io.emit('console', 'Error try: ' + error.message);
                            }
                        } else {
                            recordFound += 1;
                            if (walkerEnd) {
                                oncomplete();
                            }
                        }
                    });
                }
                next();
            });

            walker.on('errors', function(root, nodeStatsArray, next) {
                next();
            });

            walker.on('end', function() {
                console.log('new photos folder walk completed with ',recordCheck, ' records checked, records found: ',recordFound, ' and records added: ',totalCount);
                io.emit('console', 'folder walk completed with ' + String(recordCheck) + ' records checked, records found: ' +
                    String(recordFound) + ' and records added: ' + String(totalCount));
                walkerEnd = true;
                oncomplete();
            });
        });
    });

    adminrouter.route('/contact').get(function(req, res) {
        res.render('contact');
    });

    return adminrouter;

};

module.exports = router;
