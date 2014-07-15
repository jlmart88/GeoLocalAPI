var querystring = require('../node_modules/querystring/querystring');
var http = require('http');

//Sanitize the parameters and make sure the given params and included
function checkParameters(body,res,params){
    sanitizeStrings(body);
    sanitizeArrays(body);

    // validate that the given parameters exist
    var missing = [];
    for (param in params){
        if (Array.isArray(params[param])){
            data = body[params[param][0]];
            for (var i=1; i<params[param].length; i++){
                if (data != '' && data != null){
                    data = data[params[param][i]];
                }
            }
        } else data = body[params[param]];
        if (data == '' || data == null){
            missing.push(("'"+params[param].toString()+"'").replace(/,/g,":"));
        }
    }

    var err;
    if (missing.length > 0){
        err = "Missing/Invalid Parameters: "+missing;
        res.send({error:2,cause:err});
        return false;
    }
    return true;
}

// Helper method for removing all whitespace from all values in an object
function sanitizeStrings(body){
    traverseObject(body,function(item){
        if (typeof(item) == "string"){
            item = item.replace(/\s/g,'');
        }
        return item;
    });
}

// Helper method for removing all null/empty elements from all arrays in an object
function sanitizeArrays(body){
    traverseObject(body,function(item){
        if (Array.isArray(item)){

            item = item.filter(function(element,index) {
                return (element!='' && element!=null && (item.indexOf(element)==index || typeof(element)=='number'));
            });
        }
        return item;
    });
}

// Helper method for iterating through all values in an object
function traverseObject(object, func){
    for (key in object){
        if (object[key] != null){
            object[key] = func(object[key]);
        } 
        if (typeof(object[key])=="object"){
            traverseObject(object[key],func);
        }
    }
}

// Handle the result of a database call/throw an error
function databaseResultHandler(res,err,result){
    //console.log("Error: "+JSON.stringify(err));
    //console.log("Result: "+JSON.stringify(result));
    res.send(
        (err == null) ? { error:0, response:result } : { error:3, cause: err }
    );
}

//Create and send the request for a callback
function sendRequest(host,path,body){
    var options = {
        host: host,
        path: path+'?'+querystring.stringify(body),
        method: "GET"
    };
    var request = http.request(options, function(res) {
        //Do something with the response if necessary, for now just log it
        //console.log(res);
        console.log('STATUS: ' + res.statusCode);
        console.log('HEADERS: ' + JSON.stringify(res.headers));
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            console.log('BODY: ' + chunk);
        });
    });

    request.on('error', function(e) {
      console.log('problem with request: ' + e.message);
    });

    // write the request parameters
    request.write(JSON.stringify(body));
    console.log("Sending Request:");
    //console.log(request);
    request.end();
}

// Handle the result of a callback error
function callbackErrorHandler(err){
    console.log('Error in callback: ');
    console.log(err);
}

exports.checkParameters = checkParameters;
exports.databaseResultHandler = databaseResultHandler;
exports.callbackErrorHandler = callbackErrorHandler;
exports.sendRequest = sendRequest;