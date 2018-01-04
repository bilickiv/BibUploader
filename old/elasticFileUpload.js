// read command line argument
var args = process.argv.slice(2);


// import convert scripts
const pureJSON = require("./esguiv2/server/uploadScripts/pureJSON");
const CSVToJSON = require("./esguiv2/server/uploadScripts/CSVToJSON.js");
const RDFToJSON = require("./RDFToJSON");
const XMLToJSON = require("./XMLToJSON");
const DBToJSON = require("./DBToJSON");

var fs = require('fs');
// import config file
var config = require("./elasticConfig");

global.hostAndPort = config.host + ":" + config.port;
global.elasticAuth = "-u " + config.user + ":" + config.pw;
global.restrictedFileEnable = config.restrictedFileEnable;

// if have argument
if(args.length === 1){
    var arg_file = args[0];

    // check file exist
    fs.exists(arg_file, (exists) => {
        if (exists) {

            // cut out file extension
            var ext = arg_file.split('.').pop();

            // check extension
            switch (ext){

                // if JSON file
                case "json": {
                    console.log(new Date().toLocaleString()+ " " + "Read " + "\"" + arg_file + "\"" + " file");

                    // upload json file module
                    pureJSON.uploadPureJSON(arg_file);
                    break;
                }

                // if CSV file
                case "csv": {
                    console.log(new Date().toLocaleString()+ " " + "Read " + "\"" + arg_file + "\"" + " file");

                    // convert csv to json module
                    CSVToJSON.convertCSVToJSON(arg_file);
                    break;
                }

                // if RDF file
                case "rdf": {
                    console.log(new Date().toLocaleString()+ " " + "Read " + "\"" + arg_file + "\"" + " file");

                    // convert rdf to json module
                    RDFToJSON.convertRDFToJSON(arg_file);
                    break;
                }

                // if XML file
                case "xml": {
                    console.log(new Date().toLocaleString()+ " " + "Read " + "\"" + arg_file + "\"" + " file");

                    // convert xml to json module
                    XMLToJSON.convertXMLToJSON(arg_file);
                    break;
                }

                // if DB file
                case "db": {
                    console.log(new Date().toLocaleString()+ " " + "Read " + "\"" + arg_file + "\"" + " file");

                    // convert xml to json module
                    DBToJSON.convertDBToJSON(arg_file);
                    break;
                }

                // none of them
                default: {
                    console.log('Not support ext! Please add .json, .csv or .rdf file');
                    break;
                }

            }

        } else {
            console.error(arg_file + ' does not exist');
        }
    });

}else
    console.log('Please add file path, like: \"simple.json\" ');
