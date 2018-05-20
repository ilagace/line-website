var express = require('express');
var mongodb = require('mongodb').MongoClient;
var galleryrouter = express.Router();
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
            var collection = db.collection('LinePhotos');
            collection.find({category: categ},{theme:1, folder:1, filename:1, category:1, description:1, reverseGeo:1}).toArray(function(err, results) {
                if (results) {
                    for (var i2 = 0; i2 < results.length; i2++) {
                        photoArray.push(['https://s3-us-west-2.amazonaws.com/ivanweb/' + basenav[localbasenav.indexOf(results[i2].theme)] + '/' +
                                        results[i2].folder + '/' + results[i2].filename, results[i2].description, results[i2].reverseGeo,
                                        'https://s3-us-west-2.amazonaws.com/ivanweb/' + basenav[localbasenav.indexOf(results[i2].theme)] + '/' +
                                        results[i2].folder + '/smallPhotos/' + results[i2].filename]);
                    }
                }

                res.render('gallery', {photoArray: photoArray, category: category, categ: category.indexOf(categ)});
                db.close();
            });
        });
    });

    return galleryrouter;

};

module.exports = router;
