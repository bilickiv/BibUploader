var path = require("path");
var fs = require("fs");
var dateFormat = require('dateformat');
var shell = require('shelljs');
var URLSafeBase64 = require('urlsafe-base64');
var async = require('async');
var ProgressBar = require('progress');
var request = require('request').defaults({ encoding: null });

module.exports.download = function (respJsonPath, cb){down(respJsonPath, cb)};
function downloadPDF(jsonFile, cb) {

    var data = fs.readFileSync(jsonFile);
    var json = JSON.parse(data);
    console.log(jsonFile + " " + json.length);

    var n = 0;
    var dir = path.dirname(jsonFile);
    dir = dir.replace(/\/json_files\/with_files/g,'');
    //dir = dir.replace(/cp/g,'');
    var oneFile = dir + "/" + "oneFile.json";
    //console.log(oneFile);

   // return cb(true);
    var q = async.queue(function (task, done) {
        request(task.url, function (err, res, body) {
            if (err) return done(err);
            if (res.statusCode === 200) {
                var data = new Buffer(body).toString('base64');
                var cb = [];
                cb.push(task.i);
                cb.push(data);
            } else {
                return done(res.statusCode);
            }
            done(cb);
        });
    }, 3);

    for(var obj in json){

        // 4. Put base64 pdf file into json file(s)
        q.push({url: json[obj].files.file_path, i: obj}, function (resp) {

            try {

                json[resp[0]].files["data"] = resp[1];


                fs.writeFileSync(oneFile, JSON.stringify(json[resp[0]]), 'utf8');
                console.log(new Date().toLocaleString() + " " + "Van file " + json[resp[0]]["id"]);

                //5. Upload file(s)
                upload(json[resp[0]], oneFile, function (res) {
                    n++;
                    if (n == json.length) {
                        return cb(true);
                    }
                });

            } catch (err) {
                console.log(err);
            }
        });

    }
}
function down(respJsonPath, cb) {
    console.log("Started downloading");

    var publicPath = respJsonPath + "public_files/";
    var allFiles = 0;
    var currFile = 0;

    if (fs.existsSync(publicPath)) {
        var files = fs.readdirSync(publicPath);


        //var allBar = new ProgressBar('\n :current / :total', {total: allFiles});
        async.eachLimit(files, 1, function (file, next) {
            var f = publicPath + file;         
            if(fs.lstatSync(f).isFile() && f.endsWith(".json")){
                currFile++;
                downloadPDFToLocal(f, files.length, currFile, function (resp) {
                    if(resp === true){
                        console.log(new Date().toLocaleString() + " Download finished");
                        setTimeout(() => { next(); }, 0);
                    }else {
                        //return cb(false);
                    }
                });
            }else {
                //console.log(f + " directory");
                setTimeout(() => { next(); }, 0);
            }
        }, function () {
            return cb(true);
        });
    } else {
        console.log(new Date().toLocaleString() + " Download PDFs: Path not found");
        return cb(false);
    }
}
function downloadPDFToLocal(file_path, allFiles, currFile, cb) {

    //console.log(file_path);
    try {
        var data = fs.readFileSync(file_path);
        var json = JSON.parse(data);
        var missed = [];
        console.log("\nCurrent file: " + file_path + " " + currFile + " / " + allFiles);


        var pdfs_dir = path.dirname(file_path);
        pdfs_dir = pdfs_dir + "/" + path.basename(file_path).replace(/\.[^/.]+$/, "");
        //console.log(pdfs_dir);
        if(!fs.existsSync(pdfs_dir))
            fs.mkdirSync(pdfs_dir);
        var num = 0;
        var bar = new ProgressBar(new Date().toLocaleString() + ' Downloading [:bar] :rate/bps :percent :etas :current / :total ', {width: 50, total: json.length});


    } catch (err){
        console.log(err);
        return 
    }

    async.eachLimit(json, 1, function (obj, next) {
        var d = "";
        try {
            d = pdfs_dir + "/" + obj.eprintid + "/" + path.basename(obj.files.file_path);
        }catch (err){
            console.log(err);
            //console.log(obj.id);
        }
        if(!fs.existsSync(d)){
            var dir = pdfs_dir + "/" + obj.eprintid;
            if(!fs.existsSync(dir))
                fs.mkdirSync(dir);
            var f = pdfs_dir + "/" + obj.eprintid + "/" + path.basename(obj.files.file_path);
            var response_stream = request.get(obj.files.file_path)
            response_stream.on('error', function(err) {
                    console.log(new Date().toLocaleString() + " Error");
                      })
                      response_stream.on('response', function (response) {
                console.log(new Date().toLocaleString() + " Started the download: " + obj.files.file_path);
                console.log(response.statusCode) // 200
                console.log(response.headers['content-type']) // 'image/png'
                console.log(response.headers[ 'content-length']) // 'image/png'
                response_stream.pipe(fs.createWriteStream(f))
                response_stream.on('end', function () { 
                    console.log(new Date().toLocaleString() + " Finished the download" + obj.files.file_path);
                    next()
                })
            })
    /*request({ url : obj.files.file_path, time: true}, function (err, res, body) {
                if (err)
                    console.log(err);
                if (res.statusCode === 200) {

                    try {

                        var dir = pdfs_dir + "/" + obj.eprintid;
                        if(!fs.existsSync(dir))
                            fs.mkdirSync(dir);

                        var f = pdfs_dir + "/" + obj.eprintid + "/" + path.basename(obj.files.file_path);
                        fs.writeFileSync(f, body, 'utf8');

                        num++;

                        setTimeout(() => { bar.tick(); next(); }, 0);
                        //next();

                    }catch (err){
                        console.log(obj.files.file_path);
                    }
                }else {
                    console.log(obj.files.id);
                    missed.push({"node": obj.id, "url": obj.files.file_path});
                    setTimeout(() => { next(); }, 1000);

                }
            });*/
        }else {
            // Downloaded file
            num++;
            setTimeout(() => { bar.tick(); next(); }, 0);
        }


    }, function () {
        //console.log("Download pdfs: " + file_path + " Finished");
        if(missed.length !== 0){
            setTimeout(() => { return cb(missed); }, 1000);
        }else {
            setTimeout(() => { return cb(true); }, 1000);
        }

    });
}

function putBase64PDF(respJsonPath, cb) {

    var publicFilesPath = respJsonPath + "public_files/";

    if (fs.existsSync(publicFilesPath)) {

        var allFiles = 0;
        var currFile = 0;
        var files = fs.readdirSync(publicFilesPath);
        for(var file in files){
            var f = publicFilesPath + files[file];
            if(fs.lstatSync(f).isFile()){
                allFiles++;
            }
        }
        //console.log(allFiles);
        async.eachLimit(files, 1, function (file, next) {

            var f = publicFilesPath + file;
            if(fs.lstatSync(f).isFile()){
                currFile++;
                putBase(f, allFiles, currFile, function (resp) {
                    if(resp === true)
                        setTimeout(() => { next(); }, 0);
                });
            }else {
                //console.log(file + " is dir");
                setTimeout(() => { next(); }, 0);
            }
        }, function () {
            return cb(true);
        });

    }else {
        console.log("Put base64: Path not found");
        return cb(false);
    }

}