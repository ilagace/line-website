var mongodb = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
var fs = require('fs');
var parse = require('csv-parse');
var csv = require('csv');
var dataout = [];
var comicname = [];
var datacheck = {};
var datachecked = {};

function strcompare(a,b) {
    return a[1].localeCompare(b[1]);
}

var appController = function(appdir) {

    var middleware = function(req, res, next) {
        next();
    };

    var getApp = function (req, res, next) {
        var appName = req.params.id;
        var date = new Date();
        var datapygo = [];
        var datapyoregon = [];
        dataout = [];
        comicname = [];

        if (appName.indexOf('comicslocal') !== -1) {
            var parserin = parse({delimiter: ','}, function(err, data) {
                for (var i = 0; i < data.length; i++) {
                    datacheck[data[i][0]] = 'checked';
                }
                res.render('comicspage', {data:data});
            });
            fs.createReadStream(appdir + 'SoftwareAssets/public/comics/listlocal').pipe(parserin);
        } else {
            if (appName.indexOf('comicseditdisable') !== -1) {
                var fsgo = fs.createWriteStream(appdir + 'SoftwareAssets/public/comics/listgo');
                var fsoregon = fs.createWriteStream(appdir + 'SoftwareAssets/public/comics/listoregon');
                var parser = parse({delimiter: ','}, function(err, data) {
                    for (var i = 0; i < data.length; i++) {
                        if (!(data[i][2] in datacheck)) {datacheck[data[i][2]] = '';}
                        data[i][0] = 'tiny_avatar.png';
                        comicname.push([data[i][3].substr(1,data[i][3].length),data[i][1]]);
                        data[i][3] = 'http://www.gocomics.com' + data[i][3];
                        datapygo.push([data[i][2],data[i][3]]);
                        dataout.push(data[i]);
                    }
                    fs.createReadStream(appdir + 'SoftwareAssets/public/comics/comiclistoregonedited').pipe(parser2);

                });
                var parser2 = parse({delimiter: ','}, function(err, data) {
                    for (var i = 0; i < data.length; i++) {
                        if (data[i][1] !== 'tbd') {
                            if (!(data[i][2] in datacheck)) {datacheck[data[i][2]] = '';}
                            data[i][0] = data[i][2] + '.bmp';
                            var dtemp = data[i][3].substr(1,data[i][3].length);
                            comicname.push([dtemp,data[i][1]]);
                            data[i][3] = 'http://www.oregonlive.com/comics-kingdom/?feature_id=' + dtemp;
                            datapyoregon.push([data[i][2],'http://comicskingdom.com/' + dtemp]);
                            dataout.push(data[i]);
                        }
                    }
                    csv.stringify(datapygo, function(err, output) {
                        fsgo.write(output);
                        fsgo.end();
                    });
                    csv.stringify(datapyoregon, function(err, output) {
                        fsoregon.write(output);
                        fsoregon.end();
                    });
                    comicname.sort(strcompare);
                    dataout.sort(strcompare);
                    for (var j = 0; j < dataout.length; j++) {
                        datachecked[j] = datacheck[dataout[j][2]];
                    }
                    console.log(datachecked);
                    res.render(appName, {data:dataout,datacheck:datachecked});
                });
                dataout.push(['dilbert.png','Dilbert','dilbert','http://www.dilbert.com']);
                if (!('dilbert' in datacheck)) {datacheck['dilbert'] = '';}
                dataout.push(['archie.png','Archie','archie','http://www.arcamax.com/thefunnies/archie/']);
                if (!('archie' in datacheck)) {datacheck['archie'] = '';}
                dataout.push(['mrboffoz.jpg','Mr. Boffo','mrboffo','http://www.mrboffo.com']);
                if (!('mrboffo' in datacheck)) {datacheck['mrboffo'] = '';}
                comicname.push(['dilbert','dilbert'],['archie','archie'],['mrboffo','mrboffo']);
                fs.createReadStream(appdir + 'SoftwareAssets/public/comics/comiclistgoedited').pipe(parser);
            } else {
                res.render(appName);
            }
        }
    };

    var editPost = function(req, res, next) {
        var datalocal = [];
        for (var i = 0; i < dataout.length; i++) {
            if (dataout[i][2] in req.body) {
                datalocal.push([dataout[i][2],dataout[i][1],comicname[i][0]]);
            }
        }

        var fslocal = fs.createWriteStream(appdir + 'SoftwareAssets/public/comics/listlocal');
        csv.stringify(datalocal, function(err, output) {
            fslocal.write(output);
            fslocal.end();
        });
        res.render('comicspage', {data:datalocal.sort(strcompare)});
    };

    return {
        getApp: getApp,
        editPost: editPost,
        middleware: middleware
    };
};

module.exports = appController;