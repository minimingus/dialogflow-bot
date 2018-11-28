var express = require('express');
var router = express.Router();
var session_store;
var nodemailer = require('nodemailer');
var mongodb = require("mongodb");
var ObjectID = mongodb.ObjectID;

var QUESTIONS_COLLECTION = "questions";
var USERS_COLLECTION = "users";

/* GET home page. */
router.get('/', function(req, res, next) {
	res.redirect('/ask');
});

router.get('/login',function(req,res,next){
	res.render('login');
});

router.get('/confirmation',function(req,res,next){
	console.log("confirmation "+ JSON.stringify(session_store));
	if(session_store == undefined){
		res.redirect('/login');
	} else {
		getUser(session_store["email"], function(user){
			if(user == null){
				res.redirect('/login');
			} else {
				res.render('confirmation', {email: user["email"]});
			}
		});
	}
});

router.get('/resend', function(req, res, next){
	if(session_store == undefined){
		res.redirect('/login');
	} else {
		getUser(session_store["email"], function(user){
			code = getRandomIntInclusive(1000, 9999);
			db.collection(USERS_COLLECTION).updateOne({ "email": session_store["email"] }, {$set: {"verify_code": code}},{ upsert: true }, function(err, doc){
	    	if (err != null) {
	      	res.redirect('/confirmation');
	    	} else {
	      	sendMail(user, res);
	    	}
	  	});
		});
	}
});

router.get('/ask', function(req, res, next){
	res.render('ask', {title: "You won't know if you don't ask"});	
});

router.get('/answer/:id', function(req, res, next){
	db.collection(QUESTIONS_COLLECTION).findOne({ _id: new ObjectID(req.params.id) }, function(err, doc) {
    if (err) {
      handleError(res, err.message, "Failed to get document");
    } else {
    	q = (doc == null) ? "Question is not found" : doc.questions.join("\n")
      res.render('answer',{title: "Single answer to many questions", questions: q, id: req.params.id});
    }
  });
});

router.post('/answer',function(req, res, next){	
		id = req.sanitize('document_id').escape().trim();			
		db.collection(QUESTIONS_COLLECTION).findOne({ _id: new ObjectID(id) }, function(err, updateDoc) {
    if (err) {
      handleError(res, err.message, "Failed to get document");
    } else {
    	answer = req.sanitize('answer').escape().trim();
    	db.collection(QUESTIONS_COLLECTION).updateOne({_id: new ObjectID(id)}, {$set: {"answer": answer}},{ upsert: true }, function(err, doc) {
		    if (err) {
		      handleError(res, err.message, "Failed to update document");
		    } else {
		      res.redirect('ask');
		    }
		  });
    }
  });
});

router.get('/trivia_registration', function(req, res, next){
	if( session_store == undefined){
		res.redirect('/login');
	} else {
		getUser(session_store["email"], function(user){
			if(user == null){
				res.redirect('/login');
			} else {
				if(user["confirmed"] == true){
					res.render('trivia');		
				} else {
					res.redirect('/confirmation');
				}
			} 
		});
	}	
});

router.post('/login',function(req,res,next){
	session_store=req.session;
	req.assert('email', 'Please fill the email').notEmpty();	
	var errors = req.validationErrors();
	if (!errors) {
		v_email = req.sanitize( 'email' ).escape().trim();		
		if(v_email != ""){
			session_store.email = v_email;
			user = getUser(v_email, function(user){
				if(user == null){
					var code = getRandomIntInclusive(1000, 9999);
					var user = {"email": v_email, "verify_code": code, "confirmed": false};
					db.collection(USERS_COLLECTION).insertOne(user, function(err, doc) {
		        if (err) {
		        	res.redirect('/login');
		        } else {
		          console.log("New document created " + doc.ops[0] );
		          sendMail(user, res);
		        }
		      });
				} else {
					if(user["confirmed"] == true){
						res.redirect('/trivia');
					} else {
						res.redirect('/confirmation');
					}
				}
			});
		}else{
			res.redirect('/login');
		}
	}
	else{
		errors_detail = "Sory there are error<ul>";
		for (i in errors) { 
			error = errors[i]; 
			errors_detail += '<li>'+error.msg+'</li>'; 
		} 
		errors_detail += "</ul>"; 

		console.log(errors_detail);
		res.redirect('/login'); 
	}	
});

router.post('/verify',function(req,res,next){
	console.log("Received in verify "+ JSON.stringify(req.params))
	req.assert('code', 'Please fill the code').notEmpty();	
	var errors = req.validationErrors();
	if (!errors) {
		v_code = req.sanitize( 'code' ).escape().trim();		
		if(v_code != ""){
			if(session_store == undefined ){
				res.redirect('/login');
			} else {
				getUser(session_store["email"], function(user){
					console.log("verification " + user["verify_code"] + " received : " + v_code);
					if (user["verify_code"] == v_code){
						db.collection(USERS_COLLECTION).updateOne({ "email": session_store["email"] }, {$set: {"confirmed": true}},{ upsert: true }, function(err, doc) {
							console.log("After update verify errors " + err + " and " + JSON.stringify(doc));
				    	if (err != null) {
				      	res.redirect('/confirmation');
				    	} else {
				      	res.redirect('/trivia');
				    	}
				  	});
					} else {
						res.redirect('/confirmation');
					}
				});
			}
		}else{
			res.redirect('/confirmation');
		}
	}	else {
		res.redirect('/confirmation');
	}
});

router.get('/logout', function(req, res){ 
	req.session.destroy(function(err){ 
		if(err){ 
			console.log(err); 
		} 
		else { 
			res.redirect('/login'); 
		} 
	}); 
});


module.exports = router;


function handleError(res, reason, message, code) {
  console.log("ERROR: " + reason);
  res.status(code || 500).json({"error": message});
}

var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'finastra.integration.team@gmail.com',
    pass: 'koza2012'
  }
});

function getUser(email, cb){
	console.log("Users email is " + email);
	db.collection(USERS_COLLECTION).findOne({ "email": email }, function(err, doc) {
		console.log("Check if user exists :" + err + " result :" + JSON.stringify(doc));
    if (err == null) {
      cb(doc);
    } else {
      return null;
    }
  });
}

function sendMail(user, res){
	var mailOptions = {
	  from: 'finastra.integration.team@gmail.com',
	  to: user["email"],
	  subject: 'GPP Trivia verification code',
	  text: user["verify_code"] + " is your GPP Trivia verification code."
	};

	transporter.sendMail(mailOptions, function(error, info){
	  if (error) {
	    console.log(error);
	    res.redirect('/login');
	  } else {
	    console.log('Email sent: ' + info.response);
	    res.redirect('/confirmation');
	  }
	});
}

function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min; //The maximum is inclusive and the minimum is inclusive 
}
