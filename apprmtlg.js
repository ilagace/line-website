
var express = require('express');

var app = express();

var server = require('http').createServer(app);
var io = require('socket.io')(server);

server.listen(4010, '127.0.0.1');

//var port = process.env.PORT || 3000;
var port = 4000;
console.log('process env port: ', process.env.PORT);
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var passport = require('passport');
var session = require('express-session');

var basenav = ['Line'];
var localbasenav = ['Line'];
var category = ['Mountains', 'Sea', 'Cities', 'Friendship', 'Nature', 'Family', 'Culture', 'Sports'];
var indexnav = 0;
var pagesize = 30;
var indexskip = '0';

//  Windows ---  app.js
//var homedir = 'D:/SoftwareAssets/public/';
//var appdir = 'D:/';
//  Linux ---  apprmt.js
var homedir = '/home/ec2-user/SoftwareAssets/public/';
var appdir = '../';

console.log('homedir: ',homedir,'Starting directory:', process.cwd());

var navrouter = require('./src/routes/navroutes')(basenav, localbasenav, indexnav, indexskip, pagesize, homedir);
var adminrouter = require('./src/routes/adminroutes')(basenav, localbasenav, category, io);
var galleryrouter = require('./src/routes/galleryroutes')(basenav, localbasenav, category, homedir);
var searchrouter = require('./src/routes/searchroutes')(basenav, localbasenav, indexnav, indexskip, pagesize, homedir);
var approuter = require('./src/routes/approutes')(appdir);

app.use(express.static('public'));
app.use('/', express.static('public'));
app.set('views','./src/views');

app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(session({secret: 'ivanlibrary'}));

require('./src/config/passport')(app);

app.set('view engine','ejs');

app.use('/navigation', navrouter);
app.use('/admin', adminrouter);
app.use('/search', searchrouter);
app.use('/gallery', galleryrouter);
app.use('//', approuter);

app.get('/', function (req, res) {
    res.render('website');
});

app.get('/line/', function (req, res) {
    res.render('website');
});

app.listen(port, function (err) {
    console.log('running server on port ' + port, 'Line');
});