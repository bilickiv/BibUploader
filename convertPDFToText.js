let Document = require('node-pdfbox');
var path = require("path");
var fs = require("fs");
var async = require('async');

let rootPath = '../data/json_files/'
let document = Document.loadSync('../data/json_files/public_files/split_10_public/21408/dm_1981_102.pdf');
let title = document.getInfoSync('Title');
let title1 = document.getTitleSync(); //The same of getInfo 
let author = document.getAuthorSync();
let subject = document.getSubjectSync();
let keywords = document.getKeywordsSync();
let numberOfPages = document.pagesCountSync();

const allFilesSync = (dir, fileList = []) => {
    fs.readdirSync(dir).forEach(file => {
        const filePath = path.join(dir, file)
        if (fs.statSync(filePath).isDirectory()) {
            fileList = fileList.concat(allFilesSync(filePath))
        }
        else {
            console.log(filePath)
            fileList.push(filePath)
        }
    })
    console.log(fileList)
    return fileList
}
let fileList = []
text = ""
loadFiles(rootPath, function () { console.log("Finished") })
for (i = 0; i < numberOfPages; i++) {
    text += document.getPageSync(i).getTextSync();
}
//console.log(text)

function loadFiles(pdfPath, cb) {
    allFilesSync(rootPath, fileList)
    var allFiles = 0;
    var currFile = 0;
    async.eachLimit(fileList, 1, function (file, next) {
        var f = file;
        console.log(f + "--");
        if (fs.lstatSync(f).isFile() && f.endsWith(".pdf")) {
            currFile++;
            console.log(f + "file");
            next()
        } else {
            console.log(f + " directory");
            setTimeout(() => { next(); }, 0);
        }
    }, function () {
        return cb(true);
    });

}