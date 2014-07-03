var express = require('express');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var crypto = require('crypto');

//Set up MongoDB dependencies
// Database
var mongo = require('mongoskin');
var dbName = "geo";
var db = mongo.db("mongodb://localhost:27017/"+dbName, {native_parser:true});

var routes = require('./routes/index');
var geo = require('./routes/geo');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.set('env','development');

app.use(favicon());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));



// Make db accessible to router
app.use(function(req,res,next){
    req.db = db;
    next();
});

app.use('/', routes);

//verify the signature if it is a geo request
app.use('/geo/:clientID',function(req,res,next){
    console.log('here');
    verifySignature(req,function(err,verify){
        if (verify){
            next();
        } else unauthorizedErrorHandler(res,err);
    });
});

app.param('clientID', function(req, res, next, clientID){
    req.clientID = clientID;
    next();
});

app.use('/geo/:clientID',geo);

/// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        console.error(err);
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

// Verify the signature header attached to a request
function verifySignature(req, callback){
    var db = req.db;
    var body;
    console.log(req); 
    if (req.method == 'POST' || req.method == 'PUT'){
        body = req.body;
    } else body = req.query;

    // validate that the proper headers exist
    var missing = [];
    params = ['x-signature', 'x-authentication-type', 'x-timestamp'];
    for (param in params){
        data = req.headers[params[param]];
        if (data == '' || data == null){
            missing.push(("'"+params[param].toString()+"'").replace(/,/g,":"));
        }
    }

    if (missing.length > 0){
        callback("Missing/Invalid Headers: "+missing,false);
    }
    else {
        db.collection('clientidlist').findOne({'clientID':req.params.clientID}, function(err, result){
            if (err!=null){
                callback(err,false);
            }
            else if (result!=null){
                console.log("Server-side String:");
                console.log(JSON.stringify(body)+req.headers['x-timestamp']+result.clientSecret);
                
                var signature = crypto.createHash(req.headers['x-authentication-type']).update(
                            JSON.stringify(body)+req.headers['x-timestamp']+result.clientSecret).digest('hex');
                console.log("Server-side Hash:");
                console.log(signature);
                console.log("Received Signature:");
                console.log(req.headers['x-signature']);
                console.log("Current Server Time:");
                console.log((new Date).getTime());
                console.log("Received Time:");
                console.log(parseFloat(req.headers['x-timestamp'])*1000);
                console.log("Time Difference:");
                console.log((new Date).getTime() - parseFloat(req.headers['x-timestamp'])*1000);    
               //Check that the signature is correct and the request is less than 5 minutes old
                var expireTime = 1000*60*5;
                if (signature != req.headers['x-signature']){
                    callback("Signature did not match", false);
                }
                else if (!((new Date).getTime() - parseFloat(req.headers['x-timestamp'])*1000 < expireTime)){
                    callback("Request expired", false);
                } else callback(null,true);
            }
            else {
                callback("ClientID lookup error",false);
            }
        });
    }
}

function checkHeaders(body,res){

    // validate that the proper headers exist
    var missing = [];
    params = ['x-signature', 'x-authentication-type', 'x-timestamp'];
    for (param in params){
        data = body[params[param]];
        if (data == '' || data == null){
            missing.push(("'"+params[param].toString()+"'").replace(/,/g,":"));
        }
    }

    var err;
    if (missing.length > 0){
        err = "Missing/Invalid Headers: "+missing;
        res.send({error:2,cause:err});
        return false;
    }
    return true;
}

// Send an unauthroized request error to the client
function unauthorizedErrorHandler(res,err){
    res.send({error:201, cause:"Unauthorized request: "+err});
}

module.exports = app;
