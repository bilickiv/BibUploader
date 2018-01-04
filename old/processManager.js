var converter = require('./convertXmlToJson.js');
var reformatter = require('./reformatJson.js');

module.exports.finish = function (){doFormatting()};
console.log("started")
let pathToXml = '../data/delmagyararchiv_XML.xml'
let pathToJSON = '../data/json_files/'

converter.convert(pathToXml, doFormatting)
function doFormatting(){
    console.log("finished slicing")
    reformatter.format(pathToJSON, doUpload)
}
function doUpload(){
    console.log("finished formatting")
}