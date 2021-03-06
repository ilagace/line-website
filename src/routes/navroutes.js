var express = require('express');

var mongodb = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;

var navrouter = express.Router();

var router = function(basenav, localbasenav, indexnav, indexskip, pagesize, homedir) {

    var navController = require('../controllers/navController')(basenav, localbasenav, indexnav, indexskip, pagesize, homedir);

    navrouter.use(navController.middleware);

    navrouter.route('/').get(navController.getRoot);

    navrouter.route('/:id').get(navController.getByTheme);

    navrouter.route('/folder/:id').get(navController.getInFolder);

    navrouter.route('/folder/:id/:page').get(navController.getSkipIndex);

    navrouter.route('/video/:id').get(navController.showVideo);

    navrouter.route('/diapos/:id').get(navController.showDiaporama);

    return navrouter;

};

module.exports = router;