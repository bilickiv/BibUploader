

var path = require("path");
var fs = require("fs");
var dateFormat = require('dateformat');
var shell = require('shelljs');
var URLSafeBase64 = require('urlsafe-base64');
var xml2object = require('xml2object');
var request = require('request').defaults({ encoding: null });
var async = require('async');
var rimraf = require('rimraf');
var ProgressBar = require('progress');
var config = require("./config");
global.hostAndPort = config.host + ":" + config.port;
global.elasticAuth = "-u " + config.user + ":" + config.pw;
global.restrictedFileEnable = config.restrictedFileEnable;
module.exports.upload = function (respJsonPath, cb){putBase64PDF(respJsonPath, cb)};

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

function putBase(file, allFiles, currFile, cb) {

    if(path.extname(file) === ".json") {
        var data = fs.readFileSync(file);
        var json = JSON.parse(data);
        /*var oneJson = [];
        // Direct json
        for(var j in json){
            if(json[j].id === "http://acta.bibl.u-szeged.hu/id/eprint/45255"){
                oneJson = json[j];
            }
        }*/
    
        console.log("File: " + file);
        console.log("Progress: " + currFile + "/" + allFiles);
        var bar = new ProgressBar(new Date().toLocaleString() + ' Uploading [:bar] :rate/bps :percent :etas :current / :total ', {total: json.length});
    
        var num = 0;
    
        async.eachLimit(json, 1, function (obj, next) {
    
            if(obj.files){
                var pdfDir = path.dirname(file);
                var pdfName = path.basename(obj.files.file_path);
                pdfDir = pdfDir + "/" + path.basename(file).replace(/\.[^/.]+$/, "");
                pdfDir = pdfDir + "/" + obj.eprintid + "/" + pdfName;
                if(fs.existsSync(pdfDir)){
    
                    var index = path.dirname(file);
                    index = index.match(/[^/\\]+/);
                    index = index[0].replace(/[^\w\s]/gi, '');
                    index = index.replace(/ /g, "_");
                    index = index.toLowerCase();
    
    
                    checkDocExistAndUpToDate(index, obj.eprintid, obj.lastmod, function (resp) {
                        if(resp === true){
                            setTimeout(() => { bar.tick(); next(); }, 0);
                        } else {
    
                            try{
                                var bitmap = fs.readFileSync(pdfDir);
                            } catch (err){
                                console.log("Put Base ERROR: Read file " + obj.id);
                                //console.log(err);
                                setTimeout(() => { next(); }, 1000);
                            }
    
                            try {
                                // convert binary data to base64 encoded string
                                var res = null;
                                res = new Buffer(bitmap).toString('base64');
                                obj.files["data"] = res;
                            } catch (err){
                                console.log("Put Base ERROR: Base64 encode " + obj.id);
                                //console.log(err);
                                setTimeout(() => { next(); }, 1000);
                            }
    
                            var oneFilePath = path.dirname(file);
                            oneFilePath = oneFilePath.match(/[^/\\]+/);
                            oneFilePath = oneFilePath[0] + "/" + "oneFile.json";
    
                            try {
                                fs.writeFileSync(oneFilePath, JSON.stringify(obj), 'utf8');
                            } catch (err) {
                                console.log("Put Base ERROR: Write file " + obj.id);
                                //console.log(err);
                                setTimeout(() => { next(); }, 1000);
                            }
                            upload(obj, bar, oneFilePath, function (resp) {
                                if (resp === true) {
                                    //console.log("Uploading..." + "\t" + ++num +"/" + json.length);
                                    setTimeout(() => { next(); }, 0);
                                }else {
                                    console.log("UPLOAD ERROR: " + obj.id);
                                    setTimeout(() => { next(); }, 0);
                                }
                            });
    
                        }
                    });
    
                }else {
                    console.log("Put Base ERROR: Not found path " + pdfDir);
                }
            }else {
                console.log("Put Base ERROR: No files object " + obj.id);
            }
        }, function () {
            console.log("\nPut Base: " + file + " Finished");
            return cb(true);
        });    } else
        return cb(true)   
    
}

function checkIndexIsEmpty(index,cb) {
    var sh_command = 'curl -XGET '+ hostAndPort +'/'+ index + '/_count';
    var result = shell.exec(sh_command, {silent:true});
    //console.log(sh_command);
    if (result.code !== 0) {
        shell.echo('Error: Sh cmd');
        shell.exit(1);
    }else {
        var elastic = result.stdout;
        elastic = JSON.parse(elastic);
        //console.log(elastic);
        if(elastic.count){
            if(elastic.count === 0){
                console.log("checkIndexIsEmpty: " + index + " Index is empty");
                return cb(true);
            }else {
                // have docs
                return cb(false);
            }
        }
    }
}

function createElasticIndex(xmlFilePath, index, cb) {
    //var sh_command = 'curl '+ elasticAuth +' -XPUT '+ hostAndPort +'/'+ index;

    var xmlDir = path.dirname(xmlFilePath);

    var mapping = {
        "mappings": {
            "xml": {
                "properties": {
                    "date": {
                        "type": "date",
                        "format": "yyyy || yyyy-MM || yyyy-MM-dd"
                    },
                    "numPages": {
                        "type": "long"
                    },
                    "volume": {
                        "type": "long"
                    }
                }
            }
        }
    };
    var mapPath = xmlDir + "/mapping.json";

    fs.writeFileSync(mapPath, JSON.stringify(mapping), 'utf8');
    mapPath = path.resolve(mapPath);

    var sh_command = "curl " + elasticAuth +" -XPUT \""+ hostAndPort +"/"+ index + "\"" + " -d @"+mapPath;

    /*var sh_command = "curl " + elasticAuth +" -XPUT '"+ hostAndPort +"/"+ index +
        "' -d' { \"mappings\": { \"xml\": { \"properties\": { \"date\": { \"type\": \"date\", \"format\": \"yyyy || yyyy-MM-dd\" } } } } }'";*/
    console.log(sh_command);
    var result = shell.exec(sh_command, {silent:true});
    if (result.code !== 0) {
        shell.echo('Error: Sh cmd');
        shell.exit(1);
    }else {
        var elastic = result.stdout;
        elastic = JSON.parse(elastic);
        //console.log(elastic);
        if(elastic.acknowledged){
            if(elastic.acknowledged === true){
                console.log("createElasticIndex: " + index + " Index created");
                fs.unlink(mapPath);
                return cb(true);
            }
        }else {
            console.log(elastic);
        }
    }
}

function checkElasticIndexExist(index, cb){
    var sh_command = 'curl ' + elasticAuth +' -XGET '+ hostAndPort +'/'+ index;
    var result = shell.exec(sh_command, {silent:true});
    if (result.code !== 0) {
        shell.echo('Error: Sh cmd');
        shell.exit(1);
    }else {
        var elastic = result.stdout;
        elastic = JSON.parse(elastic);
        //console.log(elastic);
        if(elastic.error){
            if(elastic.error.reason === "no such index")
           // not exist index
            return cb(false);
        }else {
            // have OK, check have document
            //console.log("checkElasticIndexExist: " + index + " Index exist");
            return cb(true);
        }
    }
}

function checkDocExistAndUpToDate(index, id, lastmod, cb) {

    var sh_command = 'curl '+ elasticAuth +' -XGET '+ hostAndPort +'/'+ index +'/xml/' + id + '?_source=eprintid';
    //console.log(sh_command);
    var result = shell.exec(sh_command, {});

    if (result.code !== 0) {
        shell.echo('Error: Sh cmd');
        shell.exit(1);
    }else {

        var elastic = result.stdout;
        elastic = JSON.parse(elastic);

        if(elastic.found === true){

            //console.log("Check document exist: OK, found it " + hostAndPort +'/'+ index +'/xml/' + id);

            // IF doc exist -> check up to update
            sh_command = 'curl -XGET '+ hostAndPort +'/'+ index +'/xml/' + id + '?_source=lastmod';

            var upToDateExec = shell.exec(sh_command, {silent:true});
            if(upToDateExec.code !== 0){
                shell.echo('Error: Sh cmd');
                shell.exit(1);
            }else {

                var elacticResp = upToDateExec.stdout;
                elacticResp = JSON.parse(elacticResp);
                //console.log(lastmod); // 2017-05-15 16:06:43
                if(lastmod === elacticResp._source.lastmod){
                    //console.log("Check document exist: OK, up to date " + hostAndPort +'/'+ index +'/xml/' + id);
                    return cb(true);
                }else {
                    //console.log("Check document exist: Need to update " + hostAndPort +'/'+ index +'/xml/' + id);
                    return cb(false);
                }
            }

        }else if(elastic.found === false) {
            //console.log("Check document exist: Not exist yet " + hostAndPort +'/'+ index +'/xml/' + id);
            return cb(false);
        }
    }
}


function uploadWithFiles(respJsonPath, cb) {
    //console.log(respJsonPath);
    var withFile = respJsonPath + "with_files/";

    if (fs.existsSync(withFile)) {
        var files = fs.readdirSync(withFile);

        async.eachLimit(files, 1, function (file, next) {
           //console.log(file);
           /*downloadPDF(withFile + file, function (resp) {
               if(resp === true)
                   next();
           });*/
        }, function () {
            return cb(true);
        });
    } else {
        console.log("Public upload: Path not found");
        return cb(false);
    }
}

function uploadWithFile(file, oneFile, cb) {

    fs.readFile(file, function (err, data) {

        var json = JSON.parse(data);
        var oneFile_dir = path.dirname(file);

        var n = 0;

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
        }, 1);


        for(var obj in json){

                //console.log(oneFile);
                // 4. Put base64 pdf file into json file(s)
                q.push({url: json[obj].files.file_path, i: obj}, function (resp) {

                    try {

                        json[resp[0]].files["data"] = resp[1];


                        fs.writeFileSync(oneFile, JSON.stringify(json[resp[0]]), 'utf8');
                        console.log(new Date().toLocaleString() + " " + "Have file " + json[resp[0]]["id"]);

                        //5. Upload file(s)
                        upload(json[resp[0]], oneFile, function (res) {
                            n++;
                            if(n == json.length){
                                return cb(true);
                            }
                        });

                    } catch (err){
                        console.log(err);
                    }
                });



                /*putBase64PDF(json[obj], oneFile, function (res) {
                    n++;
                    if(n == json.length){
                        //console.log(n);
                        return cb(true);
                    }
                });*/

        }
    });
}

function uploadNoneFiles(respJsonPath, cb) {
    var nonePath = respJsonPath + "none_files/";
    console.log(nonePath);
    if(fs.existsSync(nonePath)){

        var files = fs.readdirSync(nonePath);
        var bar = new ProgressBar(new Date().toLocaleString() + ' Uploading [:bar] :rate/bps :percent :etas :current / :total ', {width: 50, total: files.length});

        async.eachLimit(files, 1, function (file, next) {

            uploadNone(nonePath + file, respJsonPath, function (res) {
                if(res){
                    setTimeout(() => {bar.tick(); next(); }, 0);
                }else {
                    return cb(false);
                }
            });
        }, function () {
            console.log("None attach files upload: Finished");
            return cb(true);
        });

    }else {
        console.log("None attach files upload: Path not found ");
        return cb(false);
    }

}

function uploadRestrictedFiles(respJsonPath, cb) {
    var restrictedPath = respJsonPath + "restricted_files/";
    //console.log(restrictedPath);
    if(fs.existsSync(restrictedPath)){
        var files = fs.readdirSync(restrictedPath);

        var bar = new ProgressBar(new Date().toLocaleString() + ' Uploading [:bar] :rate/bps :percent :etas :current / :total ', {width: 50, total: files.length});
        async.eachLimit(files, 1, function (file, next) {

                if(restrictedFileEnable === false){
                    // upload without attachment
                    //console.log("Upload without attachment files");

                    uploadRestricted(restrictedPath + file, respJsonPath, function (res) {
                        if(res === true){
                            setTimeout(() => {bar.tick(); next(); }, 0);
                            //next();
                        }else {
                            console.log("HIBA");
                        }
                    });

                }else {
                    // upload with attachment
                    console.log("Upload with attachment files");
                    return cb(false);
                }

            }, function () {
                console.log("Restricted upload: Finished");
                return cb(true);
            });

    }else {
        console.log("Restricted upload: Path not found ");
        return cb(false);
    }
}

function uploadNone(file, base, cb) {
    var index = base.replace(/json_files/g, "");
    index = index.replace(/[^\w\s]/gi, '');
    index = index.replace(/ /g, "_");
    index = index.toLowerCase();

    // get file full path
    file = path.resolve(file);

    var editor = "";
    if(process.platform === "win32"){
        editor = "type";
    }else {
        editor = "cat";
    }

    // Create shell script command
    // If the OS is Windows then use 'type' keyword. Otherwise use 'cat' on the Linux.
    var sh_command = editor + ' ' + '\"' + file + '\"' + ' | jq -c ".[] | {\\"index\\": ' +
        '{\\"_index\\": \\"' + index +'\\", \\"_type\\": \\"xml\\", \\"_id\\": .eprintid}}, ." ' +
        '| curl '+ elasticAuth +' -XPOST "' + hostAndPort + '/_bulk" --data-binary @-';

    //console.log(sh_command);


    //console.log(new Date().toISOString().replace('T', ' ').replace(/\..*$/, '') + " " + 'Uploading...');

    // Run external tool synchronously
    // Execution to upload json file to the server
    if (shell.exec(sh_command, {silent: true}).code !== 0) {
        shell.echo('Error: Sh cmd');
        shell.exit(1);
    }else {
        //console.log(new Date().toISOString().replace('T', ' ').replace(/\..*$/, '') + " " + "Upload was successful");
        setTimeout(() => { return cb(true); }, 0);
    }
}

function uploadRestricted(file, base, cb) {

    var index = base.replace(/json_files/g, "");
    index = index.replace(/[^\w\s]/gi, '');
    index = index.replace(/ /g, "_");
    index = index.toLowerCase();

    // get file full path
    file = path.resolve(file);

    var editor = "";
    if(process.platform === "win32"){
        editor = "type";
    }else {
        editor = "cat";
    }

    // Create shell script command
    // If the OS is Windows then use 'type' keyword. Otherwise use 'cat' on the Linux.
    var sh_command = editor + ' ' + '\"' + file + '\"' + ' | jq -c ".[] | {\\"index\\": ' +
        '{\\"_index\\": \\"' + index +'\\", \\"_type\\": \\"xml\\", \\"_id\\": .eprintid}}, ." ' +
        '| curl '+ elasticAuth +' -XPOST "' + hostAndPort + '/_bulk" --data-binary @-';

    //console.log(sh_command);


    //console.log(new Date().toISOString().replace('T', ' ').replace(/\..*$/, '') + " " + 'Uploading...');

    // Run external tool synchronously
    // Execution to upload json file to the server
    if (shell.exec(sh_command, {silent: true}).code !== 0) {
        shell.echo('Error: Sh cmd');
        shell.exit(1);
    }else {
        //console.log(new Date().toISOString().replace('T', ' ').replace(/\..*$/, '') + " " + "Upload was successful");
        setTimeout(() => { return cb(true); }, 0);
    }
}