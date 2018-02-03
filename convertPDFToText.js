let Document = require('node-pdfbox');
var path = require("path");
var fs = require("fs");
var async = require('async');

let rootPath = '../data/json_files/'
module.exports.extractTextFromPdf = function (rootPath, cb){loadFiles(rootPath, function () { 
    console.log("Finished loading the list of files")
    extractTextFromPdf(cb) 
})};

const allFilesSync = (dir) => {
    let fp
    fs.readdirSync(dir).forEach(file => {
        const filePath = path.join(dir, file)
        fp = filePath
        if (fs.statSync(filePath).isDirectory() && !filePath.includes('.DS_Store')) {
            console.log('Processing directory' + filePath)
            //fileList = fileList.concat(allFilesSync(filePath))
            allFilesSync(filePath)
        }
        else {
            //console.log(filePath)
            if(filePath.includes('.pdf'))
            fileList.push(filePath)
        }
    })
    //console.log(fileList)
    console.log('Return from directory' + fp)
    console.log('The number of pdf files is  ' + fileList.length)
    return fileList
}
let fileList = []
text = ""


//console.log(text)

function loadFiles(pdfPath, cb) {
    allFilesSync(rootPath)
    return cb()    
}
function extractTextFromPdf(cb)
{
    
    async.eachLimit(fileList, 1, function (file, next) {
        if (fs.lstatSync(file).isFile() && file.endsWith(".pdf")) {
            let textFile = file.replace(".pdf",".txt")
            if(fs.existsSync(textFile))
            {
                setTimeout(() => { next(); }, 0)
            }else
            {
                try{
                    let document = Document.loadSync(file);
                    let title = document.getInfoSync('Title');
                    let title1 = document.getTitleSync(); //The same of getInfo 
                    let author = document.getAuthorSync();
                    let subject = document.getSubjectSync();
                    let keywords = document.getKeywordsSync();
                    let numberOfPages = document.pagesCountSync();
                    for (i = 0; i < numberOfPages; i++) {
                        text += document.getPageSync(i).getTextSync();
                    }
                    //console.log(text)
                    fs.writeFileSync(textFile, text); 
                }catch(err)
                {
                    console.log(err)
                }
                setTimeout(() => { next(); }, 0);
            }            
        } else {
            //console.log(f + " directory");
            setTimeout(() => { next(); }, 0);
        }
    }, function (err) {
        return cb(true);
    });
}