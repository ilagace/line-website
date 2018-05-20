var express = require('express');

var mongodb = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;

var searchrouter = express.Router();

var router = function(basenav, localbasenav, indexnav, indexskip, pagesize, homedir) {

    var searchController = require('../controllers/searchController')(basenav, localbasenav, indexnav, indexskip, pagesize, homedir);

    searchrouter.use(searchController.middleware);

    searchrouter.route('/').get(searchController.getEmpty);

    searchrouter.route('/postyear').post(searchController.postYear);

    searchrouter.route('/posttext').post(searchController.postText);

    searchrouter.route('/year/:id').get(searchController.getYear);

    searchrouter.route('/text/:id').get(searchController.getText);

    searchrouter.route('/skip/:id/:page').get(searchController.getSkipIndex);

    searchrouter.route('/videoyear/:id').get(searchController.showVideoYear);

    searchrouter.route('/videotext/:id').get(searchController.showVideoText);

    return searchrouter;

};

module.exports = router;