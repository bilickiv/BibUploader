var fs = require("fs");
var path = require("path");
var dateFormat = require('dateformat');
var shell = require('shelljs');
var URLSafeBase64 = require('urlsafe-base64');
var request = require('request').defaults({ encoding: null });
var async = require('async');
var ProgressBar = require('progress');
const sqlite3 = require('sqlite3').verbose();


var config = require("./elasticConfig");

global.hostAndPort = config.host + ":" + config.port;
global.elasticAuth = "-u " + config.user + ":" + config.pw;

/*module.exports = {
    "convertDBToJSON": function (dbFilePath) {
        console.log(dbFilePath);
    }
};*/

//convertDBToJSON("feltolteni/Burney TITLE 41 Church.db");
//convertDBToJSON("feltolteni/BP_MAGYAR_PUB DATA 1800tol_1939igoptimized.db");

function convertDBToJSON(dbFilePath) {

    getSQLiteTables(dbFilePath, function (resp) {
        if (resp === true) {
            console.log("done");


            // create index mapping
            var index = path.basename(dbFilePath);
            index = index.replace(/\.[^/.]+$/, "");
            index = index.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            checkElasticIndexExist(index, function (resp) {
               if(resp === true){
                   console.log("index exist");

                   // 2. reformat and add image url to objects

                   reformatData(dbFilePath, function (resp) {
                       if (resp === true) {
                           console.log("Reformat data done");

                          uploadJsonFile(dbFilePath, function (resp) {
                            if (resp === true) {
                            console.log("uploadJsonFile done");
                            }
                            });
                       }
                   });


               }else {
                   console.log("Index not exist");
                   createElasticIndex(dbFilePath, index, function (resp) {
                      if(resp === true){
                          console.log("DONE");

                          // 2. reformat and add image url to objects

                          reformatData(dbFilePath, function (resp) {
                              if (resp === true) {
                                  console.log("Reformat data done");

                                  uploadJsonFile(dbFilePath, function (resp) {
                                   if (resp === true) {
                                   console.log("uploadJsonFile done");
                                   }
                                   });
                              }
                          });
                      }
                   });
               }
            });


        }
    });

    // 2. reformat and add image url to objects

    /*reformatData(dbFilePath, function (resp) {
        if (resp === true) {
            console.log("Reformat data done");

            uploadJsonFile(dbFilePath, function (resp) {
                if (resp === true) {
                    console.log("uploadJsonFile done");
                }
            });
        }
    });*/

    // 3. putbase64 and upload

   /* addBase64Files(dbFilePath, function (resp) {
       if(resp === true){
           console.log("addBase64Files done");
       }
    });*/

   //imageUploadTest("19th_newspapers_hungary_relevance/sndt86a6.pdf");


}

function createElasticIndex(dbFilePath, index, cb) {
    var dbDir = index;

    var mapping = {
        "mappings": {
            "db": {
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
    var mapPath = dbDir + "/mapping.json";
    fs.writeFileSync(mapPath, JSON.stringify(mapping), 'utf8');
    mapPath = path.resolve(mapPath);

    var sh_command = "curl " + elasticAuth +" -XPUT \""+ hostAndPort +"/"+ index + "\"" + " -d @"+mapPath;
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

function checkElasticIndexExist(index, cb) {
    var sh_command = 'curl ' + elasticAuth +' -XGET '+ hostAndPort +'/'+ index;
    //console.log(sh_command);
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

function imageUploadTest(filePath) {

    var bitmap = fs.readFileSync(filePath);
    var res = { "files": {"data": new Buffer(bitmap).toString('base64')} };
    console.log(res);
    fs.writeFileSync(path.dirname(filePath) + "/" + "testImage.json", JSON.stringify(res, null, 2), 'utf8');

    var index = "testimage";


    var sh_command = "curl -XPOST "+ hostAndPort +"/"+ index +"/db/1" +"?pipeline=attachment -d @"+path.dirname(filePath) + "/" + "testImage.json";
    console.log(sh_command);

    var result = shell.exec(sh_command, {silent: false});

    if (result.code !== 0) {
        shell.echo('Error: Sh cmd');
        shell.exit(1);
    }else {
        console.log("OK");
    }


}

function uploadJsonFile(dbFilePath, cb) {

    var dirName = path.basename(dbFilePath);
    dirName = dirName.replace(/\.[^/.]+$/, "");
    dirName = dirName.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    if(fs.existsSync(dirName)){

        var files = fs.readdirSync(dirName);


        async.eachLimit(files, 1, function (file, next) {

            if(fs.lstatSync(dirName + "/" + file).isFile() && dirName + "/" + file !== "oneFile.json"){


                var fpath = path.resolve(dirName + "/" + file);

                var editor = "";
                if(process.platform === "win32"){
                    editor = "type";
                }else {
                    editor = "cat";
                }

                var sh_command = editor + ' ' + '\"' + fpath + '\"' + ' | jq -c ".[] | {\\"index\\": ' +
                    '{\\"_index\\": \\"' + dirName +'\\", \\"_type\\": \\"db\\", \\"_id\\": .id}}, ." ' +
                    '| curl '+ elasticAuth +' -XPOST "' + hostAndPort + '/_bulk" --data-binary @-';

                console.log(sh_command);

                var result = shell.exec(sh_command, {silent: false});

                if (result.code !== 0) {
                    shell.echo('Error: Sh cmd');
                    shell.exit(1);
                }else {
                    var elastic = result.stdout;
                    //console.log(elastic);
                    //console.log(new Date().toISOString().replace('T', ' ').replace(/\..*$/, '') + " " + "Upload was successful");
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
                        console.log("\n" + new Date().toISOString().replace('T', ' ').replace(/\..*$/, '') + " " + "Upload was successful" + "\n");
                        console.log("next");
                        next();
                    }
                }

            }else {
                console.log("no file -> next");
                next();
            }
        }, function () {
            console.log("end");
            return cb(true);
        });
    }


}

function addBase64Files(dbFilePath, cb) {

    var dirName = path.basename(dbFilePath);
    dirName = dirName.replace(/\.[^/.]+$/, "");
    dirName = dirName.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    if(fs.existsSync(dirName)){

        var files = fs.readdirSync(dirName);


        async.eachLimit(files, 1, function (file, next) {
            if (fs.lstatSync(dirName + "/" + file).isFile()) {

                var data = fs.readFileSync(dirName + "/" + file);
                var json = JSON.parse(data);

                var nonAttachArr = [];


                async.eachLimit(json, 1, function (obj, next) {
                    if (obj["files"]) {

                        if (obj["files"].length > 0) {

                            for (var i = 0; i < obj.files.length; i++) {

                                try {
                                    var bitmap = fs.readFileSync(obj.files[i].file_path);
                                    var res = null;
                                    res = new Buffer(bitmap).toString('base64');
                                    obj.files[i]["data"] = res;

                                } catch (err) {
                                    console.log(err);
                                }
                            }
                            fs.writeFileSync(dirName + "/" + "oneFile.json", JSON.stringify(obj, null, 2), 'utf8');
                            uploadFile(dirName + "/" + "oneFile.json", obj, function (resp) {
                                if(resp === true){
                                    setTimeout(() => { next(); }, 0);
                                }
                            });
                        } else {


                            // single file
                            //console.log(obj.files.file_path);
                            setTimeout(() => { next(); }, 0);
                        }
                    } else {
                        // not have attachment
                        nonAttachArr.push(json[obj]);
                        setTimeout(() => { next(); }, 0);
                    }
                }, function () {
                    console.log("end");
                });
            }
            else {
                // no file -> next
                next();
            }
        });

    }

}

function uploadFile(oneFilePath, json, cb) {
    console.log(oneFilePath);

    var index = path.dirname(oneFilePath);
    var fpath = path.resolve(oneFilePath);

    var sh_command = "curl "+ elasticAuth +" -XPOST "+ hostAndPort +"/"+ index +"/db/"+ json["id"] +"?pipeline=attachment -d @"+fpath;
    console.log(sh_command);

}


function reformatData(dbFilePath, cb) {
    var dirName = path.basename(dbFilePath);
    dirName = dirName.replace(/\.[^/.]+$/, "");
    dirName = dirName.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    if(fs.existsSync(dirName)){

        var files = fs.readdirSync(dirName);


        async.eachLimit(files, 1, function (file, next) {

            if(fs.lstatSync(dirName + "/" + file).isFile()){

                var data = fs.readFileSync(dirName + "/" + file);
                var json = JSON.parse(data);

                renameObjProps(json, dirName + "/" + file, function (resp) {
                    if(resp === true){
                        console.log("Rename prop done");

                        addImageFiles(json, dirName + "/" + file, function (resp) {
                            if(resp === true){
                                console.log("addImageFiles done");
                                next();
                            }
                        });
                    }
                });
            }else {
                //console.log("no file -> next");
                next();
            }
        }, function () {
            return cb(true);
        });


    }else {
        console.log("Not found path " + dirName);
    }
}

function addImageFiles(json, filePath, cb) {
    console.log("Call addImageFiles");

    var fileData = path.basename(filePath);
    fileData = fileData.split("_")[0] + "data";

    if(fs.existsSync(path.dirname(filePath) + "/" + fileData)){
        //console.log("Have");

        var nodeID = path.basename(filePath).split("_");
        nodeID = "n" + nodeID[0] + "id";


        for(var obj in json){

            var oneDir = path.dirname(filePath) + "/" + fileData + "/" + json[obj][nodeID];


            if(fs.existsSync(oneDir)){

                var imgs = fs.readdirSync(oneDir);
                if(imgs.length > 1){

                    // multi img files

                    var filesObj = [];

                    for(var img in imgs){

                        var size = fs.statSync(oneDir + "/" + imgs[img]).size;

                        var oneImg = {"file_path": oneDir + "/" + imgs[img], "file_size": size.toString()};
                        filesObj.push(oneImg);

                        //console.log(filesObj);

                    }

                    json[obj]["files"] = filesObj;

                }else{

                    // single img file
                    var filesObj = {};
                    var size = fs.statSync(oneDir + "/" + imgs).size;
                    filesObj["file_path"] = oneDir + "/" + imgs;
                    filesObj["file_size"] = size.toString();
                    //console.log(filesObj);

                    json[obj]["files"] = filesObj;
                }
            }else {
                // not have image
                //console.log("Not have image path: " + oneDir);
            }

        }
        fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf8');
        return cb(true);

    }else {
        console.log("Not Have");
        return cb(true);
    }

}

function renameObjProps(json, filePath, cb) {


    var fileNode = path.basename(filePath);
    fileNode = fileNode.split("_")[0];



   for (var obj in json){

        if(json.hasOwnProperty(obj)){

            json[obj]["id"] = path.basename(filePath).replace(/\.[^/.]+$/, "") + "_" + json[obj]["n"+fileNode+"id"];
            //console.log(path.basename(filePath).replace(/\.[^/.]+$/, "") + "_" + json[obj]["n"+fileNode+"id"]);


            // repo key - value
            if(fileNode === "burney"){
                json[obj]["repository"] = "By";
            }

            if(fileNode === "britishperiodicals"){
                json[obj]["repository"] = "BP";
            }


            // properties
            if(json[obj]["sauthor"]){
                rename_prop(json, "author", "sauthor");
            }

            if(json[obj]["stitle"]){
                rename_prop(json, "title", "stitle");
            }

            if(json[obj]["snewspaper"]){
                rename_prop(json, "publicationTitle", "snewspaper");
            }

            if(json[obj]["sissn"]){
                rename_prop(json, "issn", "sissn");
            }

            if(json[obj]["sfulltextexcerpt"]){
                rename_prop(json, "abstractNote", "sfulltextexcerpt");
            }

            if(json[obj]["ddate"]){
                rename_prop(json, "date", "ddate");
            }

            if(json[obj]["snewversionofpages"]){
                rename_prop(json, "pages", "snewversionofpages");
            }

            if(json[obj]["npages"]){
                rename_prop(json, "numPages", "npages");
            }

            if(json[obj]["npagenumber"]){
                rename_prop(json, "numPages", "npagenumber");
            }

            if(json[obj]["sissue"]){
                rename_prop(json, "issue", "sissue");
            }

            if(json[obj]["spublisher"]){
                rename_prop(json, "publisher", "spublisher");
            }

            if(json[obj]["slocation"]){
                rename_prop(json, "place", "slocation");
            }

            if(json[obj]["slanguageofpublication"]){
                rename_prop(json, "language", "slanguageofpublication");
            }

            if(json[obj]["scategory"]){
                rename_prop(json, "type", "scategory");
            }

            if(json[obj]["sjournalsubjects"]){
                rename_prop(json, "manualTags", "sjournalsubjects");
            }

            if(json[obj]["sjournaleditor"]){
                rename_prop(json, "editor", "sjournaleditor");
            }

            if(json[obj]["scountryofpublication"]){
                rename_prop(json, "country", "scountryofpublication");
            }


            //new fields, is not have in zotero
            if(json[obj]["ddatetimeto"]){
                rename_prop(json, "burneyDateTimeTo", "ddatetimeto");
            }

            if(json[obj]["nnumberofwords"]){
                rename_prop(json, "numberOfWords", "nnumberofwords");
            }

            if(json[obj]["salternativetitle"]){
                rename_prop(json, "alternativeTitle", "salternativetitle");
            }

            if(json[obj]["sfrequencyofpublications"]){
                rename_prop(json, "frequencyOfPublications", "sfrequencyofpublications");
            }

            if(json[obj]["ssourcetype"]){
                rename_prop(json, "BPSourceType", "ssourcetype");
            }

            json[obj]["date"] = dateFormat(json[obj]["date"], "yyyy-mm-dd");


            for(var inner in json[obj]){

                if(typeof json[obj][inner] != "undefined" && json[obj][inner].match(/;/g) && inner != "notes"){
                    var res = json[obj][inner].split(";");

                    if(res.length > 1){
                        //console.log(res);
                        for(var i=0; i<res.length; i++){
                            res[i] = res[i].trim();
                        }
                        json[obj][inner] = res;
                    }else{
                        //console.log(res[0]);
                        json[obj][inner] = res[0];
                    }
                }

            }

        }
    }

    fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf8');
    return cb(true);

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


function getSQLiteTables(dbFilePath, cb) {

    var dbFile = path.basename(dbFilePath);
    var db = new sqlite3.Database(dbFilePath, sqlite3.OPEN_READWRITE, (err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Connected to the '+dbFile+' database.');

        // 1. get tables in json file and save images
        getTables(db, function (tables) {
            if (tables !== 0) {

                // url safe folder where contains data
                var dirName = path.basename(dbFilePath);
                dirName = dirName.replace(/\.[^/.]+$/, "");
                dirName = dirName.replace(/[^a-z0-9]/gi, '_').toLowerCase();

                getOneTable(db, dirName, tables, function (resp) {
                    if (resp === true) {
                        console.log("getOneTable OK");
                        return cb(true);

                    }
                });
            } else {
                console.log("Tables array empty");
            }
        });


        /*db.close((err) => {
            if (err) {
                console.error(err.message);
            }else {
                console.log('Close the database connection.');
                return cb(true);
            }
        });*/


    });

}

function getTables(db, cb) {

    var tablesArray = [];
    db.serialize(function () {

        db.each(`select Name as name from sqlite_master where type='table'`, function (err, tables) {
            if (err) {
                console.error(err.message);
            }

            if (tables.name !== "sqlite_sequence" && tables.name !== "DbVersion") {
                tablesArray.push(tables.name);
            }
        },function () {
            return cb(tablesArray);
        });
    });

}

function getOneTable(db, dirName, tables, cb) {
    //console.log(dirName);

    async.eachLimit(tables, 1, function (table, next) {

        db.serialize(function () {

            db.all('select * from ' + table, function (err, result) {


                // if not table is empty
                if (result.length !== 0) {


                    // contain images
                    if (result[0].ldata) {
                        console.log(table + " contains: " + result.length);

                        var nodeID = table.toLowerCase();
                        nodeID = nodeID.replace(/data/g, '');
                        nodeID = "n" + nodeID + "id";
                        //console.log(nodeID);


                        for (var obj in result){
                            if(result.hasOwnProperty(obj)){


                                // create folders
                                if(!fs.existsSync(dirName))
                                    fs.mkdirSync(dirName);

                                var fileDir = dirName + "/" + table.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                                if(!fs.existsSync(fileDir))
                                    fs.mkdirSync(fileDir);

                                try {
                                    fileDir += "/" + result[obj][nodeID];
                                    if(!fs.existsSync(fileDir))
                                        fs.mkdirSync(fileDir);
                                    //console.log(fileDir);

                                } catch (err){
                                    console.log("Not found: " + nodeID);
                                    console.log(err);
                                }
                                fs.writeFileSync(fileDir + "/" + "image_" + result[obj].npagenumber + "." + result[obj].sdatatype, result[obj].ldata, 'binary');

                            }
                        }


                        console.log("next");
                        next();

                    } else {

                        // contain metadata
                        console.log(table + " contains: " + result.length);
                        for (var obj in result) {
                            if (result.hasOwnProperty(obj)) {

                                for (var inner in result[obj]) {

                                    // delete prop and value when is empty
                                    if (result[obj][inner] == null) {
                                        delete result[obj][inner];
                                    }

                                    // int to string conv
                                    if (result[obj][inner] === parseInt(result[obj][inner])) {
                                        result[obj][inner] = result[obj][inner].toString();
                                        //console.log("Key: " + inner + " Value: " + result[obj][inner]);
                                    }
                                }

                                // trim all string in object
                                trimObj(result[obj]);
                            }
                        }

                        // url safe table folder name
                        var tableName = table.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                        var fileDir = dirName + "/" + tableName + "_" + result.length + ".json";
                        console.log(fileDir);

                        if(!fs.existsSync(dirName))
                            fs.mkdirSync(dirName);


                        // fileDir = bp_free_and_accepted_mason_uj_jutka/britishperiodicals_42.json


                        //console.log('Current perf: ', process.memoryUsage());
                        fs.writeFileSync(fileDir, JSON.stringify(result, null, 2), 'utf8');
                        console.log("next");
                        next();

                    }

                }else {
                    console.log(table + " is empty: " + result.length);
                    console.log("next");
                    next();
                }
            });
        });
    }, function () {
        console.log("End");
        return cb(true);
    });
}

function trimObj(obj) {
    for (var prop in obj) {
        var value = obj[prop], type = typeof value;
        if (value != null && (type == "string" || type == "object") && obj.hasOwnProperty(prop)) {
            if (type == "object") {
                trimObj(obj[prop]);
            } else {
                obj[prop] = obj[prop].trim();
            }
        }
    }
}

function makeName() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < 10; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}