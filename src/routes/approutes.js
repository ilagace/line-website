var express = require('express');

var mongodb = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;

var approuter = express.Router();

var router = function(appdir) {

    var appController = require('../controllers/appController')(appdir);

    approuter.use(appController.middleware);

    approuter.route('/:id').get(appController.getApp);

    approuter.route('/comicsedit').post(appController.editPost);

    return approuter;

};

module.exports = router;