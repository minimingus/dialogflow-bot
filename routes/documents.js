var express = require('express');
var router = express.Router();
var fs = require('fs');
var pdf = require('pdf-parse');
var BUSINESSGUIDES_COLLECTION = "businessguides";

router.get('/', function(req, res, next) {
	res.send("OK !!!")   	
});

router.get('/add/:source', function(req, res, next){ 
  readFiles(db, 'public/docs/', function(db, filename, documents) {    
    // store or update documents in mongodb
    if(documents.length > 0){
      documents.forEach(function(dct){
        //db.collection(BUSINESSGUIDES_COLLECTION).insertOne(dct, function(err, doc) {
        //  if (err) {
        //    handleError(res, err.message, "Failed to create new docuemnt.");
        //  } else {
        //    console.log("New document created " + doc.ops[0] );
        //  }        
        //});
      })
    }
  }, function(err) {
    throw err;
  });

  res.send("OKey")
})


module.exports = router;


function readFiles(db, dirname, onFileContent, onError) {
  fs.readdir(dirname, function(err, filenames) {
    if (err) {
      onError(err);
      return;
    }
    filenames.forEach(function(filename) { 
      if(filename.indexOf("dvic") > -1) {
        let dataBuffer = fs.readFileSync(dirname + filename);
        pdf(dataBuffer).then(function(data) { 
            split2documents(filename, data, onFileContent);
        });
      }   
      
    });
  });
}


function split2documents(filename, data, cb){ 
  //console.log("\n\n\n************************************************")
  //console.log("File name: "  + filename); 
      
  var docs = []
  //get table of content
  remained_arr = data.text.split("Table of Contents")
  //console.log("Filename  :"+ filename + " has TOC parts : " + remained_arr.length); 
  remained = remained_arr[remained_arr.length -1];  
  //console.log("Filename  :"+ filename + " cut all before TOC : " + remained.substring(0,100)); 

  // split to separate items for next parse
  toc_items = remained.split('\n').filter(function(p){return p.indexOf('..........') > -1 });
  len = toc_items.length;
  console.log("Filename  :"+ filename + " TOC sections : " + toc_items)
  // get the first section namd and cunt untill it
  first_section = toc_items[0].split('.......')[0].replace(/[0-9]/g, '').replace('.', '').trim();
  if((/[a-z]/.test(first_section)) == false){ first_section = first_section.capitalize() };
  //console.log("Filename  :"+ filename + " FIRST SECTION : " + first_section);   
  remained_arr = remained.split(first_section);
  //console.log("Filename  :"+ filename + " has FIRST SECTION parts : " + remained_arr.length); 
  remained = remained_arr[remained_arr.length-1];
  //console.log("Filename  :"+ filename + " cut all before FIRST SECTION : " + remained.substring(0,100)); 
  
  
  // go in loop and cut with next item , cutting part save 
  for(var i=0; i<len; i++){    
    var section = toc_items[i].split('.......')[0].replace(/[0-9]/g, '').replace('.', '').trim();
    if((/[a-z]/.test(section)) == false){ section = section.capitalize() }
    console.log("Filename  :"+ filename + " CURRENT SECTION : " + section);
    console.log("Filename  :"+ filename + " cut all after CURRENT SECTION : " + remained.substring(0,100)); 
    var content = "";
    if(toc_items[i+1] == undefined){
      content = remained
    } else {
      if ( remained != undefined){
            next = toc_items[i+1].split('.......')[0].replace(/[0-9]/g, '').replace('.', '').trim();      
            if((/[a-z]/.test(next)) == false){ next = next.capitalize() }
            console.log("Filename  :"+ filename + " NEXT SECTION : " + next);
            remained_arr = remained.split(next);
            console.log("Filename  :"+ filename + " has NEXT SECTION parts : " + remained_arr.length); 
            if(remained_arr.length > 1){
              content = remained_arr[0];
              remained = remained_arr[remained_arr.length-1];  
            }
          }
    }
    console.log("+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++")
    console.log("Filename  :"+ filename + " section "+ section + " content : " + content.substring(0,40));
    console.log("+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++\n\n")
    /*if(content != undefined && content.length > 0 ){
      //console.log("\n-----------------------------------------")
      //console.log("Section : " + section);
      //console.log("Content : " + content);
      //console.log("-----------------------------------------")
      var content_arr = content.replace(/\r?\n|\r/g,"").split(". ").map(s => s.trim())
      //console.log("Filename  :"+ filename + " Sentences : " + content_arr);
      var sentences = [];
      for(var k=0; k<content_arr.length; k++){
        var item = content_arr[k].replace(/\r?\n|\r/g, '').replace(/[0-9]/g, '').replace('.', '').trim();        
        if(item.length > 0){          
          sentences.push(item)
        }
      }      
      //
      if (sentences.length > 0) { 
        //console.log("+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++")
        //console.log("Filename  :"+ filename + " Sentences : " + sentences);
        //console.log("+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++")
        docs.push({
                  "filename": filename,
                  "numpages": data.numpages,
                  "scope": filename.replace(".pdf","").replace("GPP Business Guide",""),
                  "section" : section,
                  "content" : sentences
                });         
      }   
    }*/
  }
  //console.log("************************************************\n\n\n")
  cb(db, filename, docs);
 }

String.prototype.capitalize = function() {
  str_arr = this.split(" ")
  res = []
  str_arr.forEach(function(str){
    if(str.trim().toLowerCase().indexOf("and") > -1 && str.trim().length == 3){
      res.push("and")
    }else{
      res.push( (str.charAt(0).toUpperCase() + str.toLowerCase().slice(1)) )
    }
  })
  return res.join(" ");
}

