var converter = require('./convertXmlToJson.js');
var reformatter = require('./reformatJson.js');
var downloader = require('./downloadPdfFiles.js');
var uploader = require('./uploadFile.js');
var textExtratctor = require('./convertPDFToText.js');

module.exports.finish = function (){doExtractingTextFromPdf()};
console.log("started")
let pathToXml = '../data/delmagyararchiv_XML.xml'
let pathToJSON = '../data/json_files/'

converter.convert(pathToXml, doFormatting)


function doFormatting(){
    console.log("Finished XML2JSON")
    reformatter.format(pathToJSON, doDownloading)
}
function doDownloading(pathToJSON){
    console.log("Finished formatting")
    downloader.download(pathToJSON,doExtractingTextFromPdf)
}
function doExtractingTextFromPdf()
{
    textExtratctor.extractTextFromPdf(pathToJSON,end)
}
function doUploading()
{
    console.log("Finished downloading")
    uploader.upload(pathToJSON,doExtractingTextFromPdf)
}

function end(){
    console.log("Finished all")
}