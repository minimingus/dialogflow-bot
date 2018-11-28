var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var flash = require('express-flash');
var session = require('express-session');
var logger = require('morgan');

var index = require('./routes/index');
var webhook = require('./routes/webhook');
var documents = require('./routes/documents');

var expressValidator = require('express-validator');
var db;

var app = express();
global.appRoot = path.resolve(__dirname);
global.currentFlow = "";


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({
    secret: "secretpass123456",
    resave: false,
    saveUninitialized: false
}));
app.use(flash());
app.use(expressValidator());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/webhook', webhook);
app.use('/documents', documents);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
