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
var ObjTree = require('xml-objtree');

console.log('TEST')
module.exports.convert = function (path, cb){convert(path, cb)};
//convert(pathToXml)
function convert(xmlFilePath,cb) {
    console.log(xmlFilePath)
    removeFiles(xmlFilePath,XMLSplitter,cb);
    return cb()
}
function endOfProcessing(){
    console.log('End of processing')
}
function XMLSplitter(xmlFilePath, fragment, cbend) {
    console.log('Splitting files')

    // Create a new xml parser with an array of xml elements to look for
    var parser = new xml2object([fragment], xmlFilePath);
    var content;
// First I want to read the file
   /* fs.readFile(xmlFilePath, function read(err, data) {
        if (err) {
            throw err;
        }
        content = data;

        // Invoke the next step here however you like
        console.log(content);   // Put all of the code here (not the best solution)
        var objTree = new ObjTree();

        var json = objTree.parseXML(content); 
    });*/

   
   
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
      //  console.log("Found an object: %s ", name);

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
            return });
        }
    return });

    // Bind to the file end event to tell when the file is done being streamed
    parser.on('end', function () {

        num++;
        createFile(xmlFilePath, num, temp, function (resp) {
            if (resp === true) {
                // Finished parsing xml!

                var dir = path.dirname(xmlFilePath) + "/json_files/";
                // outer function callback
                console.log("Finished inside");
                return cbend();
            }
        });
        console.log("Finished");
    });
    // Start parsing the XML
    parser.start();
}
function removeFiles(xmlFilePath,cb,cbend) {
    console.log('Removing files')
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
    return cb(xmlFilePath, 'eprint',cbend)
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
return cb(false)
}
