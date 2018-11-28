var express = require('express');
var router = express.Router();
var QUESTIONS_COLLECTION = "questions";
var session_store;
var nodemailer = require('nodemailer');
var mongodb = require("mongodb");
var ObjectID = mongodb.ObjectID;

/* GET home page. */
router.get('/', function(req, res) {		
	res.send("OK !!!")
});

router.post('/', function(req, res, next) {
  console.log("******************************");
  console.log("webhook request :" + JSON.stringify(req.body.queryResult));
  console.log("try :" + JSON.stringify(req.session));
  switch (req.body.queryResult["intent"]["displayName"]){
    case "New Office":
      sendScriptsByMail(req.body.queryResult.parameters, res)
      break; 
    case "What Is":
      replyWithDefinition(req.body.queryResult, res) 
      break; 
    case "FeatureCheck":
      replyWithDefinition(req.body.queryResult, res) 
      break;  
  }    
});

module.exports = router;

function replyWithDefinitionOld(opts, res){
  var def = ""  
  switch (opts["WhatIsTopic"].toLowerCase()) {
    case "base currency":
      def = "The currency in which the bank maintains its accounts and the first currency quoted in a currency pair. It is typically the local currency.";
      break;
    case "bank identifier":
      def = "ISO 9362 (also known as BIC code or SWIFT code) is a standard format of Bank Identifier Codes approved by the International Organization for Standardization. It is the unique identification code of a particular bank";
      break;
    case "suspense account":
      def = "Specifies the account to which the money willbe moved for the temprorary time, aka washing account";
      break;
    case "settlement account":
      def = "Select the Settlement Account that the local bank uses at the MOP for payments exchanged with this MOP";
      break;
    case "membership id":
      def = "Member ID for the MOP selected from the Parties Data Search window. After selection, value of BIC/BEI, ABA or CP ID, is shown based on the Member Type.";
      break;
    default: 
      def = "Sorry. Not sure about this one… will check with Oracle and get back to you by email."
      break;
  }

  res.json({
          "fulfillmentText": def
        });
 
}


function replyWithDefinition(opts, res){  
  getDocument(opts, function(doc){
    if( doc != undefined && doc != null){        
      if(doc.answer.length > 0 ){
        res.json({
          "fulfillmentText": doc.answer
        });
      } else {        
        res.json({
          "fulfillmentText": "Sorry. Not sure about this one… will check with Jedi and get back to you."
        });
      }
    } else {
      res.json({
          "fulfillmentText": "Sorry. Not sure about this one… will check with Jedi and get back to you."
        });
    }
  })
}

// Document structure
// {
//   "searchind": "What Is^membership id",
//   "intent" : {  
//      "name": "projects/drive-91f16/agent/intents/2d9059a4-aa07-4453-8fb9-5995e97fd41f",
//      "displayName": "What Is"
//   },
//   "questions": ["do you know what bank routing is?" ],
//   "parameters" : {  
//      "WhatIsTopic": "bank routing",
//      "Result": ""
//   },
//   "answer" : ""
//
function getDocument(opts, cb){
  console.log("parameters are " + JSON.stringify(opts) + "db " + db);
  var searchind = opts["intent"]["displayName"] + "^" + opts["parameters"]["WhatIsTopic"];
  console.log("searchind are " + searchind);
  db.collection(QUESTIONS_COLLECTION).findOne({"searchind": searchind}, function(err, doc) {
    console.log("Check if user exists :" + err + " result :" + JSON.stringify(doc));
    if (err == null) {
      console.log("OPts " + JSON.stringify(opts))
      if(doc == null){
        addDocument(opts, function(){ cb(doc);})
      } else {
        cb(doc);
      }

    } else {
      return null;
    }
  });
}

function addDocument(opt, cb){ 
  console.log("addDocument  " + JSON.stringify(opt))
 var sindex = opt["intent"]["displayName"] + "^" + opt["parameters"]["WhatIsTopic"];
 var new_doc = {"searchind":  sindex, "intent": opt["intent"], "questions": [opt["queryText"]], "parameters": opt["parameters"], "answer": ""};
 console.log(" New Doc " + new_doc)
  db.collection(QUESTIONS_COLLECTION).insertOne(new_doc, function(err, doc) {
    if (err) {
      cb(doc)
    } else {
      console.log("New document created " + doc.ops[0] );
      // should be here Jedi selection
      sendMail({
        "email": "alexander.perman@finastra.com",
        "url": "https://know-robot.herokuapp.com/answer/" + ObjectID(new_doc._id).toString()
      });
      cb(new_doc);
    }
  });
}

var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'finastra.integration.team@gmail.com',
    pass: 'koza2012'
  }
});

function handleError(res, reason, message, code) {
  console.log("ERROR: " + reason);
  res.status(code || 500).json({"error": message});
}

function sendMail(opts){
  var mailOptions = {
    from: 'finastra.integration.team@gmail.com',
    to: opts["email"],
    subject: 'Question to Jedi',
    text: "Hi Jedi! \n We have a question to you please follow the link "+opts["url"]+" and Force will be with you. :)"
  };

  transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      console.log('Email was not sent: ' + error);
    } else {
      console.log('Email sent: ' + info.response);       
    }
  });
}

function sendScriptsByMail(opts, res){
  var mailOptions = {
    from: 'finastra.integration.team@gmail.com',
    to: "alexander.perman@finastra.com",
    subject: 'New Office - script',
    text: "Great. The new office "+ opts["NewOfficeName"] +" for "+ opts["OfficeCountry"] +" is created successfully. You can start processing the BOOK payment immediately. In case you wish to enable SEPA , just ask an I will do it for you. Also, the detailed report of "+ opts["NewOfficeName"] +" office is sent to your email. \n\n\n\n INSERT INTO BANKS (OFFICE,UPDATE_DATE,TIME,OPERATOR,OFFC_NAME,OFFC_ADDR1,OFFC_ADDR2,BSNESSDATE,REL_ORDER,FPRINT,TIME_STAMP,CURRENCY,COUNTRYCODE,CALNAME,ACCOUNTNO,MIN_ACC_LENGTH,MAX_ACC_LENGTH,HEDGE_CURRENCY,CUST_CODE,REC_STATUS,LEGAL_ENTITY,MIN_FEE_TRANS_AMOUNT,FEE_CURRENCY,PROFILE_CHANGE_STATUS,PENDING_ACTION,PROCESSING_STATUS,EFFECTIVE_DATE,REFERENCEBRANCH,FORCE_LEAD_ZERO,TRUNC_LEAD_ZERO,OTHER_BASE_CCY,NEXT_BSNESSDATE,PREV_BSNESSDATE,UID_BANKS,CUTOFF_NAME,HISTORY_PROC_DT,LANG,DEF_BOOKNG_ENT,DEF_CNSLD_FEE_POST,DEF_CNSLD_PNL_POST,POST_ZERO_FEE,BTCH_CTRL_ID,DEF_CNSLD_TAX_POST,DEF_CNSLD_TAX_PNL_POST,ISO_CODE_LOGICAL_FIELD,IN_SCOPE_IND,FILE_DUPLICATE_CHECK_IND,MIN_NUM_OF_AUTHORIZ_SUBSCRIBER,LIMIT_CCY,RFF_DUPLICATE_CHECK_IND,ESTM_DUPLICATE_CHECK_IND,ORDER_TYPE,FORMAT_NAME,STATEMENT_DUPLICATE_CHECK_IND,STATEMENT_FORMAT_NAME) VALUES ('"+ opts["NewOfficeName"] +"',null,null,null,'"+ opts["NewOfficeName"] +" Office',null,null,to_date('14-NOV-16','DD-MON-RR'),null,null,'2016-11-14 09:36:00.666','"+ opts["CaseCurrency"] +"','"+ opts["OfficeCountry"] +"','"+ opts["CaseCurrency"] +"',null,'9 ','34',null,'"+ opts["BankIdentifier"] +"','AC',null,null,null,'NO','UP',null,to_date('14-NOV-16','DD-MON-RR'),null,0,0,null,to_date('15-NOV-16','DD-MON-RR'),to_date('14-NOV-16','DD-MON-RR'),'"+ opts["NewOfficeName"] +"',null,to_date('11-NOV-16','DD-MON-RR'),'ENGLISH',null,null,null,0,null,null,null,null,1,1,null,'"+ opts["CaseCurrency"] +"',null,null,null,null,null,null)"
  };

  transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      console.log(error);
       res.json({
          "fulfillmentText": "Sorry , but the supplied data is incorrect please repat the procedure."
        }); 
    } else {
      console.log('Email sent: ' + info.response);
       res.json({
          "fulfillmentText": "Great. The new office "+ opts["NewOfficeName"] +" for "+ opts["OfficeCountry"] +" is created successfully."
        }); 
    }
  });
}

