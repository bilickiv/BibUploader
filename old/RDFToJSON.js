var path = require("path");
var fs = require("fs");
var exec = require('child_process');
var jsonld = require('jsonld');
var dateFormat = require('dateformat');
var shell = require('shelljs');
var URLSafeBase64 = require('urlsafe-base64');

module.exports = {
    "convertRDFToJSON": function (RDFFilePath){

        /*

        1. JS script: Replace rdf:resource rdf:resource to rdf:path rdf:path (rdf_script.js)
        2. Python script: rdf to json-ld
        3. JS script: Join objects (framing)
        4. JS script: Drop attachment objects and save one by one json file
        5. JS script: Reformat json files
        6. JS script: Put base64 pdf file into json files
        7. JS script: Upload files

        */

        // 1. JS script: Replace rdf:resource rdf:resource to rdf:path rdf:path (rdf_script.js)
        console.log(new Date().toISOString().replace('T', ' ').replace(/\..*$/, '') + " " + 'Replace some tag on rdf file...');
        replaceResouceString(RDFFilePath);
        console.log(new Date().toISOString().replace('T', ' ').replace(/\..*$/, '') + " " + 'Replace was successful');


        // 2. Python script: rdf to json-ld
        //console.log(RDFFilePath);
        pythonScript(RDFFilePath, function (pythonResp) {
            if(pythonResp){

                //console.log(pythonResp);
                // 3. JS script: Join objects and save one by one json file
                jsonldFraming(pythonResp);


            }
        });
    }
};



function jsonldFraming(file) {
    fs.readFile(file, 'utf8',function (err, data) {

        var doc = JSON.parse(data);

        var context = {
            "@context": {
                "@rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
                "@zotero": "http://www.zotero.org/namespaces/export#",
                "@vocab": "http://purl.org/dc/terms/",
                "@bib": "http://purl.org/net/biblio#",
                "@foat": "http://xmlns.com/foaf/0.1/",
                "@link": "http://purl.org/rss/1.0/modules/link/",
                "@dc": "http://purl.org/dc/elements/1.1/",
                "@prism": "http://prismstandard.org/namespaces/1.2/basic/",
                "@vcard": "http://nwalsh.com/rdf/vCard#"
            },
            "@zotero:itemType": { }

        };

        console.log(new Date().toISOString().replace('T', ' ').replace(/\..*$/, '') + " " + 'JSON-LD framing...');
        jsonld.frame(doc, context, function(err, framed) {
            // document transformed into a particular tree structure per the given frame
            //console.log(JSON.stringify(framed, null, 2));

            console.log(new Date().toISOString().replace('T', ' ').replace(/\..*$/, '') + " " + 'Framed was successful');


            // 4. JS script: Drop attachment objects and save one by one json file
            delete framed["@context"];
            //console.log(file);
            drop_objs(framed, file, function (dropObjResp) {
                if(dropObjResp){
                    //console.log(dropObjResp);

                    // read folder contain and reformat json file one by one
                    fs.readdir(dropObjResp, (err, files) =>{

                        global.idNumber = 1;
                        for (var i=0; i<files.length; i++){

                            // 5. JS script: Reformat json files
                            reformat(dropObjResp + files[i]);
                        }
                    });
                }
            });
        });
    });
}

function reformat(file){
    fs.readFile(file, 'utf8',function (err, data) {

        try {
            var json = JSON.parse(data);
        } catch (err){
            console.log(err);
        }

        for (var obj in json){


            if(json.hasOwnProperty(obj)){

                rename_prop(json, "id", "@id");
                rename_prop(json, "base64_id", "@base64_id");

                delete json[obj]["@type"];
                rename_prop(json, "date", "@dc:date");
                rename_prop(json, "description", "@dc:description");
                delete json[obj]["@dc:identifier"];
                rename_prop(json, "subject", "@dc:subject");
                rename_prop(json, "publisher", "@dc:publisher");

                rename_prop(json, "rights", "@dc:rights");
                rename_prop(json, "title", "@dc:title");
                rename_prop(json, "authors", "@bib:authors");

                rename_prop(json, "pages", "@bib:pages");
                rename_prop(json, "itemType", "@zotero:itemType");
                rename_prop(json, "language", "@zotero:language");
                rename_prop(json, "libraryCatalog", "@zotero:libraryCatalog");
                rename_prop(json, "shortTitle", "@zotero:shortTitle");
                rename_prop(json, "files", "@link:link");

                var inner = null;


                // date reformat
                if(json[obj]["date"]){
                    json[obj]["date"] = dateFormat(json[obj]["date"], "yyyy-mm-dd");
                }
                if(json[obj]["dateSubmitted"]){
                    json[obj]["dateSubmitted"] = dateFormat(json[obj]["dateSubmitted"], "yyyy-mm-dd");
                }


                // subject reformat
                if(json[obj]["subject"]){

                    var subject = json[obj]["subject"];
                    if( Object.prototype.toString.call( subject ) === '[object Array]' ){
                        //console.log("subject Array");

                        var new_subject = [];

                        // is files is array
                        inner = null;
                        for(inner in subject){
                            new_subject.push(subject[inner]["@rdf:value"]);
                            //console.log(subject[inner]["@rdf:value"]);
                        }

                        json[obj]["subject"] = new_subject
                        //console.log(new_subject);

                    }else{
                        console.log("subject Not Array");
                    }


                }


                // isReferencedBy reformat
                if(json[obj]["isReferencedBy"]){
                    var isReferencedBy = json[obj]["isReferencedBy"];
                    var new_isReferencedBy = {};
                    //console.log(json[obj]["isReferencedBy"]);
                    inner = null;
                    for(inner in isReferencedBy){
                        if(inner != "@id" && inner != "@type"){

                            if(inner.match(/@rdf:/g)){
                                var prop = inner.replace(/@rdf:/g, '');
                                new_isReferencedBy[prop] = isReferencedBy[inner];
                            }
                        }
                    }
                    json[obj]["isReferencedBy"] = new_isReferencedBy;
                }


                // publisher reformat
                if(json[obj]["publisher"]){
                    var publisher = json[obj]["publisher"];
                    var new_publisher = {};
                    // console.log(json[obj]["publisher"]);

                    inner = null;
                    for(inner in publisher){
                        if(inner != "@id" && inner != "@type"){
                            var prop = inner.replace(/@foat:/g, '');
                            new_publisher[prop] = publisher[inner];
                        }
                        json[obj]["publisher"] = new_publisher;
                    }
                }


                // authors reformat
                if(json[obj]["authors"]){


                    var authors = json[obj]["authors"];
                    var new_authors = [];

                    inner = null;
                    for(inner in authors){
                        if(inner.match(/@rdf:*/g)){
                            //console.log(inner);
                            var name = authors[inner]["@foat:givenname"] + " " + authors[inner]["@foat:surname"];
                            new_authors.push(name);
                            //console.log(name);
                        }
                    }
                    json[obj]["authors"] = new_authors;
                }

                // isPartOf reformat
                if(json[obj]["isPartOf"]){
                    //console.log(json[obj]["isPartOf"]);

                    var isPartOf = json[obj]["isPartOf"];
                    var new_isPartOf = {};

                    for(var inner in isPartOf){

                        if(inner.match(/@/g)){
                            //console.log("van @: " + inner);

                            if(inner != "@id"){

                                if(inner == "@type"){
                                    var prop = inner.replace(/@/g, '');
                                    //console.log(isPartOf[inner]);
                                    if(isPartOf[inner].match(/@zotero:/g)){
                                        new_isPartOf[prop] = isPartOf[inner].replace(/@zotero:/g,'');
                                    }else{
                                        new_isPartOf[prop] = isPartOf[inner].replace(/@bib:/g,'');
                                    }
                                }

                                if(inner.match(/@prism:/g)){
                                    var prop = inner.replace(/@prism:/g, '');
                                    new_isPartOf[prop] = isPartOf[inner];
                                    //console.log(new_isPartOf);
                                }
                                if(inner.match(/@dc:/g)){
                                    var prop = inner.replace(/@dc:/g, '');
                                    new_isPartOf[prop] = isPartOf[inner];
                                    //console.log(new_isPartOf);
                                }
                            }
                        }else {
                            new_isPartOf[inner] = isPartOf[inner];
                            //console.log("nincs @: " + inner);
                        }

                        json[obj]["isPartOf"] = new_isPartOf;
                    }

                }


                // files reformat
                if(json[obj]["files"]){
                    var files = json[obj]["files"];


                    //console.log(files);

                    if( Object.prototype.toString.call( files ) === '[object Array]' ) {

                        //var new_files = [];
                        var new_files = {};

                        // is files is array
                        inner = null;
                        for(inner in files){

                            if(files[inner]["@rdf:path"]){
                                //console.log(files[inner]["@rdf:path"]["@rdf:path"]);

                                if(files.hasOwnProperty(inner)){
                                    for(var inn in files[inner]){
                                        if(inn == "@rdf:path"){
                                            var ext = files[inner]["@rdf:path"]["@rdf:path"].split('.').pop();
                                            if(ext == "pdf"){
                                                var file_path_prop = inn.replace(/@rdf:/g, 'file_');
                                            }
                                        }
                                    }


                                    if(ext == "pdf"){
                                        new_files[file_path_prop] = files[inner]["@rdf:path"]["@rdf:path"];
                                    }
                                }
                            }
                            json[obj]["files"] = new_files;
                        }

                        //console.log( 'File is Array!' );


                    }else {
                        var new_files = {};

                        // files is not array
                        inner = null;

                        for(inner in files){
                            //console.log(inner);


                            if(files[inner]["@rdf:path"]){
                                //console.log(files[inner]["@rdf:path"]["@rdf:path"]);

                                if(files.hasOwnProperty(inner)){
                                    for(var inn in files[inner]){

                                        if(inn == "@rdf:path"){
                                            //console.log(inn);
                                            var ext = files[inner]["@rdf:path"].split('.').pop();
                                            if(ext == "pdf"){
                                                var file_path_prop = inn.replace(/@rdf:/g, 'file_');
                                            }
                                        }
                                    }

                                    if(ext == "pdf"){
                                        //new_files[file_type_prop] = files["@link:type"];
                                        new_files[file_path_prop] = files[inner]["@rdf:path"];
                                    }

                                }
                            }
                            if(Object.keys(new_files).length === 0 && new_files.constructor === Object){
                                delete json[obj]["files"];
                            }else {
                                json[obj]["files"] = new_files;
                            }
                        }

                        //console.log( 'File is Not Array!' );
                    }
                }

            }
        }

        //console.log(new Date().toISOString().replace('T', ' ').replace(/\..*$/, '') + " " + file + ' file reformated');
        //fs.writeFileSync(file, JSON.stringify(json, null, 2), 'utf8');
        // 6. JS script: Put base64 pdf file into json files
        putBase64File(json, file);

    });
}

function putBase64File(json, file){

    var haveAttachFile = false;

    for(var obj in json){
        if(json[obj]['files']){
            //console.log(json[obj]['files']);
            var files = json[obj]['files'];

            var file_path = files['file_path'];


            var dir = path.dirname(file);
            dir = dir.replace(/json_files/g, "");
            //console.log(dir);
            var comp_dir = dir + file_path;
            //console.log(comp_dir);

            // file encode to base64, output: res
            var bitmap = fs.readFileSync(comp_dir);
            // convert binary data to base64 encoded string
            var res = new Buffer(bitmap).toString('base64');

            for (obj in json){
                if(json[obj]['files']){
                    files = json[obj]['files'];
                    files['data'] = res;

                }
            }

            haveAttachFile = true;
            //console.log(new Date().toISOString().replace('T', ' ').replace(/\..*$/, '') + " " + file + ' put base64 data');
            fs.writeFileSync(file, JSON.stringify(json, null, 2), 'utf8');

        }else{
            haveAttachFile = false;
            // if do not have file -> save
            fs.writeFileSync(file, JSON.stringify(json, null, 2), 'utf8');
        }
    }

    // 7. JS script: Upload files
    upload(file, haveAttachFile);


}

function upload(file, haveAttachFile) {

    // Get file basename. This will be the elasticsearch index
    var index = path.dirname(file);
    index = index.replace(/\/json_files/g,'');
    index = index.replace(/\.[^/.]+$/, "");
    index = index.replace(/ /g, "_");
    index = index.toLowerCase();
    //console.log(index);

    // get file full path
    file = path.resolve(file);


    // Create shell script command
    // If the OS is Windows then use 'type' keyword. Otherwise use 'cat' on the Linux.
    var editor = "";
    if(process.platform === "win32"){
        editor = "type";
    }else {
        editor = "cat";
    }

    var sh_command = "";
    if(haveAttachFile){
        sh_command = editor + ' ' + '\"' + file + '\"' + ' | jq -c ".[] | {\\"index\\": {\\"_index\\": \\"' +
            index +'\\", \\"_type\\": \\"rdf\\", \\"_id\\": '+ idNumber +'}}, ." | curl '+ elasticAuth +' -XPOST "'+
            hostAndPort +'/_bulk?pipeline=attachment" --data-binary @-';
    }
    else{
        sh_command = editor + ' ' + '\"' + file + '\"' + ' | jq -c ".[] | {\\"index\\": {\\"_index\\": \\"'+
            index +'\\", \\"_type\\": \\"rdf\\", \\"_id\\": '+ idNumber +'}}, ." | curl '+ elasticAuth +' -XPOST "'+
            hostAndPort +'/_bulk" --data-binary @-';
    }

    console.log(sh_command);

    // Run external tool synchronously
    // Execution to upload json file to the server
    console.log(new Date().toISOString().replace('T', ' ').replace(/\..*$/, '') + " " + 'Uploading...');
    if (shell.exec(sh_command).code !== 0) {
        shell.echo('Error: Sh cmd');
        shell.exit(1);
    }else {
        console.log(new Date().toISOString().replace('T', ' ').replace(/\..*$/, '') + " " + "Upload was successful");
        idNumber++;
    }


}

function rename_prop(json, new_key, old_key) {
    for (var obj in json){

        if(json[obj][old_key]){

            if (old_key !== new_key) {
                Object.defineProperty(json[obj], new_key,
                    Object.getOwnPropertyDescriptor(json[obj], old_key));
                delete json[obj][old_key];
            }

        }

    }
}

function drop_objs(json, file, cb) {

    console.log(file);
    var json_files_path = path.dirname(file);
    json_files_path = json_files_path + "/json_files/";
    console.log(json_files_path);
    var fileNum=0;

    for (var obj in json){

        if(json.hasOwnProperty(obj)){

            for (var inner in json[obj]){
                if(json[obj][inner]["@type"] != "@zotero:Attachment"){

                    //console.log(json[obj][inner]["@id"]);
                    //console.log("\n");

                    var file_obj = [];
                    file_obj.push(json[obj][inner]);



                    if (!fs.existsSync(json_files_path)){
                        fs.mkdirSync(json_files_path);
                    }

                    //var file_name = path.basename(json[obj][inner]["@id"]);
                    //file_name =  file_name.replace(/[:\s]/g, '');
                    var crypto = json[obj][inner]["@id"];

                    // URL Safe base64
                    var file_name = URLSafeBase64.encode(new Buffer(crypto));
                    if(!URLSafeBase64.validate(file_name))
                        console.log(file_name);

                    //file_name = new Buffer(file_name).toString('base64');


                    json[obj][inner]["@base64_id"] = file_name;

                    var one_json_file = json_files_path + file_name + ".json";
                    try {
                        fs.writeFile(one_json_file, JSON.stringify(file_obj, null, 2), 'utf8');
                    } catch (err){
                        console.log(err);
                        console.log("Hiba itt: " + one_json_file);
                        console.log(file_obj);
                    }
                    fileNum++;
                    console.log(new Date().toISOString().replace('T', ' ').replace(/\..*$/, '') + " " + fileNum + '. file created');
                }
            }
        }
    }

    return cb(json_files_path);
}

function pythonScript(file, cb) {

    var python_command = "python rdf.py " + "\"" + file + "\"";
    //console.log(python_command);

    console.log(new Date().toISOString().replace('T', ' ').replace(/\..*$/, '') + " " + "Converting RDF to JSON-LD...");
    var child = exec.exec(python_command, function(error, stdout, stderr){

        if(stdout)
            console.log('stdout: ' + stdout);

        if(stderr)
            console.log('stderr: ' + stderr);

        if(error !== null)
        {
            console.log('exec error: ' + error);
        }

    });

    child.on('close', function (code) {
        //console.log('closing code: ' + code);
        if(code === 0){

            var new_file = file.replace(".rdf", ".json");
            //console.log(new_file);
            console.log(new Date().toISOString().replace('T', ' ').replace(/\..*$/, '') + " " + "\"" + path.basename(new_file) + "\"" +" file created");
            return cb(new_file);
        }
    });
}

function replaceResouceString(file) {
    fs.readFile(file, 'utf8', function (err,data) {
        if(err)
            return console.log(err);

        var result = data.replace(/rdf:resource rdf:resource/g, 'rdf:path rdf:path');

        fs.writeFile(file, result, 'utf8', function (err) {
            if(err)
                return console.log(err);
        });
    });
}
