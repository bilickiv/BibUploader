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

module.exports.format = function (respJsonPath, cb){reformatAll(respJsonPath, cb)};

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
        //return cb(true);
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

        console.log(new Date().toLocaleString() + " " + "Reformat " + "\"" + file + ".\"" + " file");

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
function progTimer(bar, resp) {
    if(resp === true){
        bar.tick();
    }else {
        console.log("STOP");
    }
}