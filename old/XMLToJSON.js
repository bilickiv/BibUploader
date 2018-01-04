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
console.log('TEST')
let xmlFilePath = '../data/delmagyararchiv_XML.xml'
removeFiles(xmlFilePath);
XMLSplitter(xmlFilePath, 'eprint', function (respJsonPath) {
    // respJsonPath is the json file(s) path
    if (respJsonPath) {
        console.log(new Date().toLocaleString() + " Splitter finished");

        reformatAll(respJsonPath, function (resp) {
            if(resp === true){
                console.log("\n" + new Date().toLocaleString() + " Reformat finished");


                indexChecker(xmlFilePath);

                uploadRestrictedFiles(respJsonPath, function (resp) {
                    if (resp === true) {
                        console.log("\n" + new Date().toLocaleString() + " Upload restricted files finished");
                    }
                });

                /*down(respJsonPath, function (resp) {
                    if (resp === true) {
                        console.log("\n" + new Date().toLocaleString() + " Download PDFs finished");


                        putBase64PDF(respJsonPath, function (resp) {
                            if (resp === true) {
                                console.log("\n" + new Date().toLocaleString() + " Put Base64 PDFs finished");

                            }
                        });
                    }
                });*/

            }
        });
    }
});
module.exports = {
    "convertXMLToJSON": function (xmlFilePath) {

        /*

         0. Remove all json file(s) before run scripts AND create index
         1. Parse xml and create json file
         When xml file is large, split the file. Default: 1000 objects / json

         2. Reformat json file(s), Group by public and restricted attachment
         3. upload without attach json files
         4. upload with attach json files
         5. Download PDFs
         5.1  Download PDFs to local storage
         6. Put base64 pdf file into json file(s)
         7. Upload file(s)

         */

        // 0. Remove all json file(s) before run scripts
        removeFiles(xmlFilePath);


        //  1. Parse xml and create json file
        XMLSplitter(xmlFilePath, 'eprint', function (respJsonPath) {

            // respJsonPath is the json file(s) path
            if (respJsonPath) {
                console.log(new Date().toLocaleString() + " Splitter finished");

                reformatAll(respJsonPath, function (resp) {
                    if(resp === true){
                        console.log("\n" + new Date().toLocaleString() + " Reformat finished");


                        indexChecker(xmlFilePath);

                        uploadRestrictedFiles(respJsonPath, function (resp) {
                            if (resp === true) {
                                console.log("\n" + new Date().toLocaleString() + " Upload restricted files finished");
                            }
                        });
                    }
                });
            }
        });

        /*var respJsonPath = "export_acta_XML/json_files/";

        putBase64PDF(respJsonPath, function (resp) {
            if (resp === true) {
                console.log("\n" + new Date().toLocaleString() + " Put Base64 PDFs finished");

                uploadRestrictedFiles(respJsonPath, function (resp) {
                    if (resp === true) {
                        console.log(new Date().toLocaleString() + " Upload restricted files finished");
                    }
                });
            }
        });*/


         /*var respJsonPath = "export_acta_XML/json_files/public_files/split_1_public.json";

         downloadPDFToLocal(respJsonPath, "43", "1", function (resp) {
         if(resp === true){
             console.log("Done");
         }else {
             console.log(resp);
         }
         });*/

         /*var respJsonPath = "export_acta_XML/json_files/split_33.json";

         reformat(respJsonPath, function (resp) {
         if(resp){
         console.log("done");
         }
         });*/


         // OK
        /*var respJsonPath = "export_acta_XML/json_files/";
        down(respJsonPath, function (resp) {
            if(resp === true){
                console.log("\n" + new Date().toLocaleString() + " Download PDFs finished");
            }
        });*/


        // OKE
        /*var respJsonPath = "export_acta_XML/json_files/";
        reformatAll(respJsonPath, function (resp) {
            if(resp){
                console.log("reformat done " + resp);

            }
        });*/


        /*uploadWithFiles(respJsonPath, function (resp) {
            if(resp === true) {
                console.log("with attach done");
            }
        });*/


        /*var respJsonPath = "export_acta_XML/json_files/";
        uploadRestrictedFiles(respJsonPath, function (resp) {
            if(resp === true){
                console.log("uploadRestrictedFiles done");
                uploadNoneFiles(respJsonPath, function (resp) {
                    if(resp === true){
                        console.log("uploadNoneFiles done");
                    }
                });
            }
        });*/


        /*var respJsonPath = "export_acta_XML/json_files/public_files/split_42_public.json";
        putBase(respJsonPath, "43", "42", function (resp) {
            if(resp === true){
                console.log("Done");
            }
        });*/

       // var respJsonPath = "export_acta_XML/json_files/";
        /*putBase64PDF(respJsonPath, function (resp) {
           if(resp === true){
               console.log("putBase64PDF done");
           }
        });*/

    }
};
console.log('TEST1')


function down(respJsonPath, cb) {
    var publicPath = respJsonPath + "public_files/";
    var allFiles = 0;
    var currFile = 0;

    if (fs.existsSync(publicPath)) {
        var files = fs.readdirSync(publicPath);


        //var allBar = new ProgressBar('\n :current / :total', {total: allFiles});
        async.eachLimit(files, 1, function (file, next) {
            var f = publicPath + file;
            if(fs.lstatSync(f).isFile()){
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

function formatBytes(a, b) {
    if (0 == a)return "0 Bytes";
    var c = 1024, d = b || 2, e = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"],
        f = Math.floor(Math.log(a) / Math.log(c));
    return parseFloat((a / Math.pow(c, f)).toFixed(d)) + " " + e[f]
}

function probadownload(obj, pdfs_dir, bar, next) {

    var data = "";
    request({url: obj.files.file_path, time: true}, function (error, response, body) {

        if (error)
            console.log(error);
        if (response.statusCode === 200) {

            try {

                var dir = pdfs_dir + "/" + obj.eprintid;
                if (!fs.existsSync(dir))
                    fs.mkdirSync(dir);

                var f = pdfs_dir + "/" + obj.eprintid + "/" + path.basename(obj.files.file_path);
                fs.writeFileSync(f, body, 'utf8');

            } catch (err) {
                console.log(obj.files.file_path);
            }
        } else {
            console.log(obj.files.id);
            missed.push({"Node": obj.id, "url": obj.files.file_path});
            setTimeout(() => {
                next();
            }, 1000);

        }
    }).on('end', function () {
        //console.log("end");
        setTimeout(() => {
            bar.tick();
            next();
        }, 0);
    });
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

            request({ url : obj.files.file_path, time: true}, function (err, res, body) {
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
            });
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

function putBase(file, allFiles, currFile, cb) {


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
    });
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

    var sh_command = 'curl -XGET '+ hostAndPort +'/'+ index +'/xml/' + id + '?_source=eprintid';
    //console.log(sh_command);
    var result = shell.exec(sh_command, {silent:true});

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


function progTimer(bar, resp) {
    if(resp === true){
        bar.tick();
    }else {
        console.log("STOP");
    }
}

function reformatAll(respJsonPath, cb) {
    var files = fs.readdirSync(respJsonPath);
    var num = 0;



    for(var file in files){
        var f = respJsonPath + files[file];
        if(!fs.lstatSync(f).isDirectory()){
            num++;
        }
    }
    var bar = new ProgressBar('[:bar] :current / :total', {total: num});
    console.log("\n" + new Date().toLocaleString() + " " + "Reformatting...");
    async.eachLimit(files, 1, function (file, next) {

        var f = respJsonPath + file;
        if(!fs.lstatSync(f).isDirectory()){
            reformat(respJsonPath + file, function (resp) {
                if(resp === true){
                    progTimer(bar, resp);
                    next();
                }else {
                    return cb(false);
                }
            });
        }else {
            next();
        }

    }, function () {
        return cb(true);
    });
        //console.log(respJsonPath + files[i]);
        /*reformat(respJsonPath + files[i], function (res) {
            num++;
            if(num == files.length){
                return cb(true);
            }
        });*/

}

function reformat(file, cb) {
    fs.readFile(file, 'utf8', function (err, data) {

        try {
            var json = JSON.parse(data);
            //console.log(json.length);
        } catch (err) {
            console.log(err);
            console.log(file);
        }

        //console.log(new Date().toLocaleString() + " " + "Reformat " + "\"" + file + ".\"" + " file");

        global.isFilePath = true;

        for (var obj in json) {


            if (json.hasOwnProperty(obj)) {

                if(json[obj]["type"])
                    rename_prop(json, "itemType", "type");

                //rename properties
                if(json[obj]["creators"])
                    rename_prop(json, "authors", "creators");

                if(json[obj]["documents"])
                    rename_prop(json, "files", "documents");

                if(json[obj]["heading_title"])
                    rename_prop(json, "sectionTitle", "heading_title");

                if(json[obj]["pagerange"])
                    rename_prop(json, "pages", "pagerange");

                if(json[obj]["keywords"])
                    rename_prop(json, "manualTags", "keywords");

                if(json[obj]["note"])
                    rename_prop(json, "notes", "note");

                if(json[obj]["corporate_name"])
                    rename_prop(json, "corporateName", "corporate_name");

                if(json[obj]["event_title"])
                    rename_prop(json, "eventTitle", "event_title");


                // delete useless objects
                if(json[obj]["rev_number"])
                    delete json[obj]["rev_number"];
                if (json[obj]["eprint_status"])
                    delete json[obj]["eprint_status"];

                if (json[obj]["userid"])
                    delete json[obj]["userid"];

                if (json[obj]["dir"])
                    delete json[obj]["dir"];

                if (json[obj]["metadata_visibility"])
                    delete json[obj]["metadata_visibility"];



                // date reformat
                if(json[obj]["date"]){
                    //json[obj]["date"] = dateFormat(json[obj]["date"], "yyyy-MM-dd HH:mm:ss");
                }

                // pages -> create numPages field
                numPages(json, obj);

                // authors reformat
                authorsReformat(json, obj);

                contributorsReformat(json, obj);

                corporateNameReformat(json, obj);

                eventTitleReformat(json, obj);

                // file reformat
                fileReformat(json, obj, function (resp) {
                    if(resp === false){
                        isFilePath = false;
                    }
                });

                if(isFilePath === false){
                    return cb(false);
                }

                // add repository field
                json[obj]["repository"] = "acta";
            }
        }

        var restrictedFiles = [];
        var publicFiles = [];
        var noneFiles = [];
        for(var obj in json){

            if(json[obj]["full_text_status"] === "restricted"){
                // push object to noFile array
                restrictedFiles.push(json[obj]);
            }else if(json[obj]["full_text_status"] === "public") {
                publicFiles.push(json[obj]);
            }else if(json[obj]["full_text_status"] === "none"){
                noneFiles.push(json[obj]);
            }
        }

        if(noneFiles.length !== 0){
            var noneFiles_dir = path.dirname(file);
            noneFiles_dir = noneFiles_dir + "/none_files/";
            if (!fs.existsSync(noneFiles_dir)) {
                fs.mkdirSync(noneFiles_dir);
            }
            var noneFile = path.basename(file).replace(/\.[^/.]+$/, "");
            noneFile = noneFiles_dir + noneFile + "_none.json";
            //console.log(noneFiles.length);
            fs.writeFileSync(noneFile, JSON.stringify(noneFiles, null, 2), 'utf8');
        }

        if(restrictedFiles.length !== 0){
            var restricted_dir = path.dirname(file);
            restricted_dir = restricted_dir + "/restricted_files/";
            if (!fs.existsSync(restricted_dir)) {
                fs.mkdirSync(restricted_dir);
            }
            var restrictedFile = path.basename(file).replace(/\.[^/.]+$/, "");
            restrictedFile = restricted_dir + restrictedFile + "_restricted.json";
            //console.log(restrictedFiles.length);
            fs.writeFileSync(restrictedFile, JSON.stringify(restrictedFiles, null, 2), 'utf8');
        }

        if(publicFiles.length !== 0){
            var public_dir = path.dirname(file);
            public_dir = public_dir + "/public_files/";
            if (!fs.existsSync(public_dir)) {
                fs.mkdirSync(public_dir);
            }
            var publicFile = path.basename(file).replace(/\.[^/.]+$/, "");
            publicFile = public_dir + publicFile + "_public.json";
            //console.log(publicFiles.length);
            fs.writeFileSync(publicFile, JSON.stringify(publicFiles, null, 2), 'utf8');
        }

        // 3. Download PDFs
        return cb(true);
    });
}

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

function upload(json, bar, file, cb) {

    var index = path.dirname(file);
    var fpath = path.resolve(file);

    index = index.replace(/[^\w\s]/gi, '');
    index = index.replace(/ /g, "_");
    index = index.replace(/json_files/g, '');
    index = index.toLowerCase();
    var sh_command = "curl "+ elasticAuth +" -XPOST "+ hostAndPort +"/"+ index +"/xml/"+ json["eprintid"] +"?pipeline=attachment -d @"+fpath;

    //console.log(new Date().toISOString().replace('T', ' ').replace(/\..*$/, '') + " " + 'Uploading...');
    // Run external tool synchronously
    // Execution to upload json file to the server
    var result = shell.exec(sh_command, {silent: false});

    if (result.code !== 0) {
        shell.echo('Error: Sh cmd');
        shell.exit(1);
    }else {

        var elastic = result.stdout;
        try {
            elastic = JSON.parse(elastic);
        } catch (err){
            console.log("[UPLOAD] JSON PARSE CATCH: " + "\n" + result.stdout + "\"");
            console.log("[UPLOAD] STDERR: " + "\n" + result.stderr + "\"");
            return cb(false);
        }
        if(elastic.error){
            console.log("[UPLOAD] ERROR RESULT: " + elastic);
            return cb(false);
        }else {
            if(elastic._shards.successful === 1){
                fs.unlinkSync(fpath);

                //console.log("\n" + new Date().toISOString().replace('T', ' ').replace(/\..*$/, '') + " " + "Upload was successful" + "\n");
                setTimeout(() => { bar.tick(); }, 0);
                return cb(true);
            }else {
                console.log("[UPLOAD] SUCCESSFUL ELSE: " + "\n" + result.stdout + "\"");
                return cb(false);
            }

        }
    }


}

function numPages(json, obj) {
    if(json[obj]["pages"]){

        if(json[obj]["pages"].match(/-/g)){
            var numPages = json[obj]["pages"].split("-");
            if(numPages[0] === "1"){
                numPages = numPages[1];
            }else
                numPages = numPages[1] - numPages[0];
            //console.log(numPages);
            json[obj]["numPages"] = numPages.toString();
        }
    }
}

function corporateNameReformat(json, obj) {
    if(json[obj].corporateName){

        try {

            if (Object.prototype.toString.call(json[obj].corporateName.item) === '[object Array]') {

                // Array
                //console.log(json[obj].corporateName);
                var new_corporateName = [];
                for(var i=0; i<json[obj].corporateName.item.length; i++){
                    new_corporateName.push(json[obj].corporateName.item[i]);
                }
                //console.log(new_corporateName);

            }else {
                var new_corporateName = "";
                new_corporateName = json[obj].corporateName.item;
                // Object
               // console.log(new_corporateName);
            }
            json[obj].corporateName = new_corporateName;

        } catch (err){
            console.log("ERROR!!! " + json[obj].id);
            console.log(err);
        }

    }
}

function contributorsReformat(json, obj) {

    // if have "contributors" field
    if(json[obj].contributors){
        try {
            if (Object.prototype.toString.call(json[obj].contributors.item) === '[object Array]') {

                // Array
                //console.log(json[obj].contributors);
                //console.log(json[obj].id);
                var new_contributors = [];
                for(var i=0; i<json[obj].contributors.item.length; i++){

                    var family = "";
                    var given = "";
                    var full_name = "";
                    if (json[obj].contributors.item[i].name.family) {
                        family = json[obj].contributors.item[i].name.family;
                    }
                    if (json[obj].contributors.item[i].name.given) {
                        given = json[obj].contributors.item[i].name.given;
                    }
                    if (json[obj].contributors.item[i].name.family && json[obj].contributors.item[i].name.given) {
                        full_name = family + " " + given;
                    } else {
                        full_name = family + given;
                    }
                    new_contributors.push(full_name);
                }
                //console.log(new_contributors);

            }else {

                // Object
                //console.log(json[obj].contributors);
                //console.log(json[obj].id);
                var family = "";
                var given = "";
                var new_contributors = "";
                if (json[obj].contributors.item.name.family) {
                    family = json[obj].contributors.item.name.family;
                }
                if (json[obj].contributors.item.name.given) {
                    given = json[obj].contributors.item.name.given;
                }
                if (json[obj].contributors.item.name.family && json[obj].contributors.item.name.given) {
                    new_contributors = family + " " + given;
                } else {
                    new_contributors = family + given;
                }
                //console.log(new_contributors);
            }

            json[obj].contributors = new_contributors;

        } catch (err){
            console.log("\nWARNING! " + json[obj].id);
            //console.log(err);
            //isFilePath = false;
        }
    }
}

function eventTitleReformat(json, obj) {
    if(json[obj].eventTitle){

        try {

            if (Object.prototype.toString.call(json[obj].eventTitle.item) === '[object Array]') {

                // Array
                var new_eventTitle = [];
                for (var i = 0; i < json[obj].eventTitle.item.length; i++) {
                    new_eventTitle.push(json[obj].eventTitle.item[i]);
                }
                //console.log(new_eventTitle);

            }else {

                // Object
                var new_eventTitle = json[obj].eventTitle.item;
                //console.log(new_eventTitle);
            }

            json[obj].eventTitle = new_eventTitle;

        } catch (err){
            console.log(err);
            console.log("EVENT TITLE REFORMAT ERROR!!! " + json[obj].id);
        }
    }
}

function authorsReformat(json, obj) {
    // if have authors field
    if (json[obj].authors) {
        //console.log(obj);

        try {
            if (Object.prototype.toString.call(json[obj].authors.item) === '[object Array]') {
                //console.log("Arr");
                // Array, many authors
                var new_authors = [];

                for (var i = 0; i < json[obj].authors.item.length; i++) {

                    var family = "";
                    var given = "";
                    var full_name = "";
                    if (json[obj].authors.item[i].name.family) {
                        family = json[obj].authors.item[i].name.family;
                    }
                    if (json[obj].authors.item[i].name.given) {
                        given = json[obj].authors.item[i].name.given;
                    }
                    if (json[obj].authors.item[i].name.family && json[obj].authors.item[i].name.given) {
                        full_name = family + " " + given;
                    } else {
                        full_name = family + given;
                    }
                    new_authors.push(full_name);
                }

                //console.log(new_authors);
            } else {

                // Object, one author
                //console.log("Object");
                var family = "";
                var given = "";
                var new_authors = "";
                if (json[obj].authors.item.name.family) {
                    family = json[obj].authors.item.name.family;
                }
                if (json[obj].authors.item.name.given) {
                    given = json[obj].authors.item.name.given;
                }
                if (json[obj].authors.item.name.family && json[obj].authors.item.name.given) {
                    new_authors = family + " " + given;
                } else {
                    new_authors = family + given;
                }
            }


            json[obj].authors = new_authors;
        } catch (err) {
            console.log("AUTHOR REFORMAT ERROR!!! " + json[obj].id);
            console.log(err);
        }
    }
}

function fileReformat(json, obj, cb) {

    try {
        if (json[obj].files) {
            var new_files = {};


            // HA document OBJ akkor nem kell for ciklus, lasd author

            if (Object.prototype.toString.call(json[obj].files.document) === '[object Array]') {

                // Array
                for (var i = 0; i < json[obj].files.document.length; i++) {
                    try {
                        //if(json[obj]["full_text_status"] === "public"){
                            if(json[obj].files.document[i].files){
                                var url = json[obj].files.document[i].files.file.url;
                                var filesize = json[obj].files.document[i].files.file.filesize;
                                if (url.split('.').pop() === "pdf") {
                                    new_files["file_path"] = url;
                                    new_files["file_size"] = filesize;
                                    //console.log(url);
                                }
                            }else {
                                console.log("\n File reformat: ERROR not found url in array");
                                console.log(json[obj].id);

                            }
                        //}else{
                            //console.log(json[obj]["full_text_status"]);
                       // }

                    } catch (err) {
                        console.log(err);
                        console.log("FULL TEXT STATUS ERROR!!! " + json[obj].id);
                    }
                }


            }else{
                // Object
               // if(json[obj]["full_text_status"] === "public"){
                    // ha van file az objektumban
                    if(json[obj].files.document.files){
                        var url = json[obj].files.document.files.file.url;
                        var filesize = json[obj].files.document.files.file.filesize;
                        if (url.split('.').pop() === "pdf") {
                            new_files["file_path"] = url;
                            new_files["file_size"] = filesize;
                            //console.log(url);
                        }
                    }else {
                        console.log("\n File reformat: ERROR not found url in object");
                        console.log(json[obj].id);
                    }
               // }
            }


            if(Object.keys(new_files).length !== 0){
                if(Object.keys(new_files).length === 0){
                    //console.log(new_files);
                }
                json[obj].files = new_files;
                return cb(true);
            }else {
                return cb(false);
            }
            //else {delete json[obj].files; }
        }
    } catch (err) {
        console.log("FILE REFORMAT ERROR!!! " + json[obj].id);
        console.log(err);
    }
}

function rename_prop(json, new_key, old_key) {
    for (var obj in json) {

        if (json[obj][old_key]) {

            if (old_key !== new_key) {
                Object.defineProperty(json[obj], new_key,
                    Object.getOwnPropertyDescriptor(json[obj], old_key));
                delete json[obj][old_key];
            }

        }

    }
}

function XMLSplitter(xmlFilePath, fragment, cb) {
    // Create a new xml parser with an array of xml elements to look for
    var parser = new xml2object([fragment], xmlFilePath);

    // file splitting number
    var num = 0;


    // cycle variable
    var i = 0;

    // temporary object, contains currently "eprint" objects
    var temp = [];

    // splitter limit
    var splitter = 1000;

    console.log(new Date().toLocaleString() + " Converting...");

    // Bind to the object event to work with the objects found in the XML file
    parser.on('object', function (name, obj) {
        //console.log("Found an object: %s ", name);

        if (i < splitter - 1) {
            temp.push(obj);
            i++;
        } else {

            // 4999 + 1
            temp.push(obj);
            num++;
            createFile(xmlFilePath, num, temp, function (resp) {
                if (resp === true) {
                    // reset temp array and cycle var
                    temp = [];
                    i = 0;
                }
            });
        }
    });

    // Bind to the file end event to tell when the file is done being streamed
    parser.on('end', function () {

        num++;
        createFile(xmlFilePath, num, temp, function (resp) {
            if (resp === true) {
                // Finished parsing xml!

                var dir = path.dirname(xmlFilePath) + "/json_files/";
                // outer function callback
                return cb(dir);
            }
        });

    });
    // Start parsing the XML
    parser.start();
}
function createFile(xmlFilePath, num, temp, cb) {
    var dir = path.dirname(xmlFilePath);
    dir = dir + "/json_files/";
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }


    // create splitted file name + ext
    var file_name = "split_" + num;
    var converted_file = dir + file_name + '.json';

    // save object into json file
    try {
        fs.writeFileSync(converted_file, JSON.stringify(temp, null, 2), 'utf8');
        console.log(new Date().toLocaleString() + " " + converted_file + ' file created');
        return cb(true);

    } catch (err) {
        console.log(err);
    }
}

function makeName() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < 10; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

function removeFiles(xmlFilePath) {
    var dir = path.dirname(xmlFilePath);
    dir = dir + "/json_files/";

    if (fs.existsSync(dir)) {
        var files = fs.readdirSync(dir);
        for(var file in files){
            if(fs.lstatSync(dir+files[file]).isFile()){
                fs.unlinkSync(dir+files[file]);
            }
        }

        /*rimraf(dir, function (resp) {
            console.log(resp);
        });*/
    }
}

function indexChecker(xmlFilePath) {
    var index = path.basename(xmlFilePath).replace(/\.[^/.]+$/, "");
    index = index.replace(/[^\w\s]/gi, '');
    index = index.replace(/ /g, "_");
    index = index.toLowerCase();
    //console.log("indexChecker",index);

    checkElasticIndexExist(index, function (resp) {
       if(resp === true){
           console.log("Index exist");

       }else {
           //console.log("Index not exist");
           // create index and mapping
           createElasticIndex(xmlFilePath, index, function (resp) {
               if(resp === true){
                   //console.log("index created");
               }
               else{
                   //console.log("index create error");
               }
           });
       }
    });
}