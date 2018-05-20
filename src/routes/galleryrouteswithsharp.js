var express = require('express');
var mongodb = require('mongodb').MongoClient;
var galleryrouter = express.Router();
var sharp = require('sharp');
var fs = require('fs');


var router = function(basenav, localbasenav, category, homedir) {

    //  Angular will handle the data for the page by calling /searchmedia
    galleryrouter.route('/:id').get(function(req, res) {
        var photoArray = [];
        var categ = category[req.params.id];
        if (!categ) {
            categ = 'Sea';
        }
        var url = 'mongodb://localhost:27017/library';
        mongodb.connect(url, function(err,db) {
            var collection = db.collection('IvanPhotos');
            collection.find({category: categ},{theme:1, folder:1, filename:1, category:1, description:1, reverseGeo:1}).toArray(function(err, results) {
                if (results) {
                    for (var i2 = 0; i2 < results.length; i2++) {
                        photoArray.push(['/assets/' + basenav[localbasenav.indexOf(results[i2].theme)] + '/' +
                                        results[i2].folder + '/' + results[i2].filename, results[i2].description, results[i2].reverseGeo]);
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
                                var image = sharp(homedir + 'assets/' + basenav[localbasenav.indexOf(results[j].theme)] + '/' +
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
                            image.resize(null, 300).toFile(homedir + 'sharp/temp' + parseInt(k), function(err) {
                                if (k === results.length - 1) {
                                    oncomplete();
                                }
                            });
                        }
                    });
                }
                // launch the web page only once the conversion is completed
                function oncomplete() {
                    res.render('gallery', {photoArray: photoArray, category: category, categ: category.indexOf(categ)});
                    db.close();

                }
            });
        });
    });

    return galleryrouter;

};

module.exports = router;
