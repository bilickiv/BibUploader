var converter = require('./convertXmlToJson.js');
var reformatter = require('./reformatJson.js');
var downloader = require('./downloadPdfFiles.js');

module.exports.finish = function (){doFormatting()};
console.log("started")
let pathToXml = '../data/delmagyararchiv_XML.xml'
let pathToJSON = '../data/json_files/'

converter.convert(pathToXml, doFormatting)
function doFormatting(){
    console.log("finished slicing")
    reformatter.format(pathToJSON, doDownloading(pathToJSON,end))
}
function doDownloading(pathToJSON,cb){
    //downloader.download(pathToJSON,cb)
}
function end(){
    console.log("Finished all")
}