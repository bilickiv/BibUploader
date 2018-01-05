var converter = require('./convertXmlToJson.js');
var reformatter = require('./reformatJson.js');
var downloader = require('./downloadPdfFiles.js');
var uploader = require('./uploadFile.js');

module.exports.finish = function (){doFormatting()};
console.log("started")
let pathToXml = '../data/delmagyararchiv_XML.xml'
let pathToJSON = '../data/json_files/'

converter.convert(pathToXml, doFormatting)
function doFormatting(){
    console.log("finished slicing")
    reformatter.format(pathToJSON, doDownloading)
}
function doDownloading(pathToJSON,cb){
    console.log("Finished formatting")
    downloader.download(pathToJSON,cb)
}
function doUploading()
{
    uploader.upload(pathToJSON,end)
}
function end(){
    console.log("Finished all")
}