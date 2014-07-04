var express = require('express');
var router = express.Router();
var async = require('async');
var http = require('http');
var querystring = require('../node_modules/querystring/querystring');

/*
 * POST to objects.
 */
router.post('/objects/:customIDs', function(req, res) {
    var db = req.db;

    //place these values in req.body to perform string sanitizing
    req.body.clientID = req.clientID;
    req.body.customIDs = req.params.customIDs.split(",");
    checkParameters(req.body,res);

    //construct each object document by iterating through the params in req.body
    var objects = [];
    for (customID in req.body.customIDs){
        var object = {};
        for (key in req.body){
            if (key!='customIDs'){
                object[key] = req.body[key]
            }
        }
        object.customID = req.body.customIDs[customID];
        objects.push(object);
    }

    //ensure the unique indexing in the object list before inserting
    db.collection('objectlist').ensureIndex(
        {'clientID':1, 'customID':1}, 
        {unique:true}, 
        function(err,result){
            if (err != null) {
                callbackErrorHandler(err);
            }
        }
    );
    
    //Insert the objects into the object list
    db.collection('objectlist').insert(objects,{'continueOnError':true}, function(err, result){
        databaseResultHandler(res,err,result);
    });
});

/*
 * PUT to objects.
 */
router.put('/objects/:customIDs', function(req, res) {
    var db = req.db;

    //place these values in req.body to perform string sanitizing
    req.body.clientID = req.clientID;
    req.body.customIDs = req.params.customIDs.split(",");
    checkParameters(req.body,res);

    //construct the update query
    var update = {};
    var fields = ['tags','related','categories'];
    for (field in fields){
        if (req.body[fields[field]] != null){
            update[fields[field]]={'$each':req.body[fields[field]]};
        }
    }

    //Update the objects in the object list
    db.collection('objectlist').update({"clientID":req.body.clientID,"customID":{'$in':req.body.customIDs}},
        {'$addToSet':update}, 
        {'multi':true},
        function(err, result){
            databaseResultHandler(res,err,result);
    });
});


/*
 * GET objects.
 */
router.get('/objects/:customIDs?', function(req, res) {
    var db = req.db;

    //place these values in req.body to perform string sanitizing
    req.body.clientID = req.clientID;
    if (req.params.customIDs){
        req.body.customIDs = req.params.customIDs.split(",");
    }
    checkParameters(req.body,res);
    checkParameters(req.query,res);

    //check if we have filters to use for our objects
    if (req.query.matching || req.query.near){
        //construct the inital query to the object list
        var query = {'clientID':req.body.clientID};
        if (req.query.matching){
            var fields = ['tags','related','categories'];
            for (field in fields){
                if (req.query.matching[fields[field]] != null){
                    query[fields[field]]={'$all':req.query.matching[fields[field]]};
                }
            }
        }
        //get the objects information
        db.collection('objectlist').find(query).toArray(function(err, objects) {
            if (err!=null){
                databaseResultHandler(res,err,objects);
            }
            else if (objects!=null){
                //if we have a near parameter, get the position information for the nearby objects
                if (req.query.near){
                    nearbyObjectsQuery(req,res,objects);
                }
                //otherwise just return the object information
                else databaseResultHandler(res,err,objects);
            }
            else {
                databaseResultHandler(res,"No object data in database","");
            }   
        });
    }
    //if there's no filters, then just return object information
    else {
        var query = {'clientID':req.body.clientID};
        if (req.params.customIDs){
            req.body.customIDs = req.params.customIDs.split(",");
            checkParameters(req.body,res);
            query.customID = {'$in':req.body.customIDs};
        }

        db.collection('objectlist').find(query).toArray(function(err, objects) {
        if (err!=null){
            databaseResultHandler(res,err,objects);
        }
        else if (objects!=null){
            databaseResultHandler(res,err,objects);
        }
        else databaseResultHandler(res,"No object data in database","");
        });
    }
});

/*
 * DELETE to objects.
 */
router.delete('/objects/:customIDs', function(req, res) {
    var db = req.db;
    //sanitize the parameters before adding the customIDs
    checkParameters(req.query,res);

    //check to see if our query is empty, so we know whether to delete the objects
    var deleteObject = true;
    for (var key in req.query) {
        if (hasOwnProperty.call(req.query, key)) deleteObject = false;
    }

    //add these parameters to the query and resanitize
    req.query.clientID = req.clientID;
    req.query.customIDs = req.params.customIDs.split(",");
    checkParameters(req.query,res);

    //if our query was empty, delete the given objects
    if (deleteObject){
        db.collection('objectlist').remove({"clientID":req.query.clientID,"customID":{'$in':req.query.customIDs}}, function(err, result){
            databaseResultHandler(res,err,result);
        })
    } 
    //otherwise, just remove the field values
    else {
        var update = {};
        var fields = ['tags','related','categories'];
        for (field in fields){
            if (req.query[fields[field]] != null){
                update[fields[field]]=req.query[fields[field]];
            }
        }

        db.collection('objectlist').update({"clientID":req.query.clientID,"customID":{'$in':req.query.customIDs}},
            {'$pullAll':update}, 
            {'multi':true},
            function(err, result){
            databaseResultHandler(res,err,result);
        });
    }
});

/*
 * POST to positions.
 */
router.post('/positions/:customID', function(req, res) {
    var db = req.db;

    //Check and sanitize the parameters
    req.body.clientID = req.clientID;
    req.body.customID = req.params.customID;
    var params = [['position','location','type'], ['position','location','coordinates'], ['position','time']];
    if (!checkParameters(req.body, res, params)) return;

    //Ensure the unique index in last position list
    db.collection('lastpositionlist').ensureIndex(
        {'clientID':1, 'customID':1}, 
        {unique:true}, 
        function(err,result){
            if (err != null) {
                callbackErrorHandler(err);
            }
        }
    );

    //Ensure the 2dsphere index in the last position list to allow for geoNear query
    db.collection('lastpositionlist').ensureIndex({'position.location':'2dsphere'}, function(err,result){
        if (err!=null){
            callbackErrorHandler(err);
        }
    });

    //Insert the location into the last position list first to see if it is newer
    db.collection('lastpositionlist').update(
                {'clientID':req.body.clientID, 'customID':req.body.customID, 'position.time': {$lt:req.body.position.time}},
                {'$set':req.body},
                {upsert:true},
                function(err,result){
            if (err!=null){
                databaseResultHandler(res,err,result);
            }
            //If the position went in successfully, then log it to the position list
            else if (result != null){

                //Insert the location into the position list
                db.collection('positionlist').insert(req.body, function(err, result){
                    if (err != null) {
                        databaseResultHandler(res,err,result);
                    } else {
                        databaseResultHandler(res,err,result);
                        //Attempt the geofence callback after we know the position update was successful
                        makeCallback(req,'geofence');

                        //Attempt the save position callback after we know the position update was successful
                        makeCallback(req,'savePosition');
                    }
                });
            }
            else databaseResultHandler(res,"Unknown error while saving position",result);
        }
    );
});

/*
 * GET to positions.
 */
router.get('/positions/:customID', function(req, res) {
    var db = req.db;

    //Sanitize the parameters
    req.query.clientID = req.clientID;
    req.query.customID = req.params.customID;
    var last = req.query.last;
    delete req.query.last;
    checkParameters(req.query, res);

    //If we only want the most recent position
    if (last){
        //First query the object list for the object information
        db.collection('objectlist').findOne(req.query, function (err, object) {
            if (err!=null){
                databaseResultHandler(res,err,object);
            }
            else if (object != null){
                //Then query the last position list
                db.collection('lastpositionlist').findOne(req.query, function(err, position){
                    if (err!=null){
                        databaseResultHandler(res,err,position);
                    }
                    //Add the position data to our object and return it
                    else if (position!=null){
                        delete position.clientID;
                        delete position.customID;
                        object.position = position.position;
                    } else databaseResultHandler(res,"No position data for object with customID: "+req.query.customID,"");
                    delete object._id;
                    databaseResultHandler(res,err,object);
                });
            }
            else databaseResultHandler(res,"No object data for object with customID: "+req.query.customID,"");
        });
    }
    //Otherwise get the list of positions for the object given the parameters
    else {
        var start;
        var end;
        var epoch = (new Date).getTime() / 1000;

        if (!req.query.start){
            start = epoch - 24*60*60; //set default start to 24 hours ago
        } else start = parseFloat(req.query.start);

        if (!req.query.end){
            end = epoch; //set default end to now
        } else end = parseFloat(req.query.end);

        //Format the query to include the range of time
        delete req.query.start;
        delete req.query.end;
        var time = 'position.time'
        req.query[time] = {"$gte":start, "$lte":end};

        //Query the position collection, sorting by timestamp
        db.collection('positionlist').find(req.query).sort({'position.time':1}).toArray(function (err, items) {
            if (err != null){
                databaseResultHandler(res,err,items);
            }
            else if (items != null){
                var results = [];
                items.forEach(function(item) {
                    results.push(item.position);
                })
                databaseResultHandler(res,err,results);
            } else databaseResultHandler(res,"No object data for object with customID "+customID,"");
        });
    }
});

/*
 * POST to geofences.
 */
router.post('/geofences/:geofenceID', function(req, res) {
    var db = req.db;

    //Check and sanitize the parameters
    req.body.clientID = req.clientID;
    req.body.geofenceID = req.params.geofenceID;
    var params = ['lng','lat','distance'];
    if (!checkParameters(req.body, res, params)) return;


    var dist = parseFloat(req.body.distance);
    var lngDeg = parseFloat(req.body.lng);
    var latDeg = parseFloat(req.body.lat);
    var latRad = latDeg*Math.PI/180;

    //Compute the square geofence around the object
    //6371.0 km = radius of Earth
    var rRad = (dist/6371.0)
    var rDeg = rRad*180/Math.PI;
    var latMin = latDeg - rDeg;
    var latMax = latDeg + rDeg;

    var lngDRad = Math.asin(Math.sin(rRad)/Math.cos(latRad));
    var lngMin = lngDeg - lngDRad*180/Math.PI;
    var lngMax = lngDeg + lngDRad*180/Math.PI;

    if (latMax > 90){
        lngMin = -180;
        latMax = 90;
        lngMax = 180;
    }
    if (latMin < -90){
        latMin = -90;
        lngMin = -180;
        lngMax = 180;
    }
    if (lngMin < -180){
        lngMin += 180;
    }
    if (lngMax > 180){
        lngMax -= 180;
    }

    var boundingBox=[[lngMin,latMin],[lngMin,latMax],[lngMax,latMax],[lngMax,latMin],[lngMin,latMin]];
    
    var geofence = {
        clientID:req.body.clientID,
        geofenceID:req.body.geofenceID,
        location:{
            type:"Polygon",
            coordinates:[boundingBox]
        },
        center:{
            type:"Point",
            coordinates:[lngDeg,latDeg]
        }
    };

    //Ensure there is a unique index in the geofence list
    db.collection('geofencelist').ensureIndex(
        {'clientID':1, 'geofenceID':1}, 
        {unique:true}, 
        function(err,result){
            if (err != null) {
                callbackErrorHandler(err);
            }
        }
    );

    //Ensure there is a 2dsphere index in the geofence list to allow for geoIntersects query
    db.collection('geofencelist').ensureIndex({'location':'2dsphere'}, function(err,result){
        if (err!=null){
            callbackErrorHandler(err);
        }
    });

    //Insert the geofence into the geofence list
    db.collection('geofencelist').insert(geofence, function(err, result){
        databaseResultHandler(res,err,result);
    });
});

/*
 * GET geofences.
 */
router.get('/geofences', function(req, res) {
    var db = req.db;

    //Sanitize the parameters
    req.query.clientID = req.clientID;
    checkParameters(req.query, res);


    //Query the geofence collection
    db.collection('geofencelist').find(req.query).toArray(function (err, geofences) {
        if (err!=null){
            databaseResultHandler(res,err,geofences);
        }
        else if (geofences!=null){
            geofences.forEach(function(geofence){
                delete geofence._id;
            });
            databaseResultHandler(res,err,geofences);
        }
        else databaseResultHandler(res,"No geofence data for clientID: "+req.query.clientID,"");
    });
});

/*
 * DELETE geofences.
 */
router.delete('/geofences/:geofenceIDs', function(req, res) {
    var db = req.db;

    //Sanitize the parameters
    req.query.clientID = req.clientID;
    req.query.geofenceIDs = req.params.geofenceIDs.split(",");
    checkParameters(req.query, res);

    //Delete the geofences from the list
    db.collection('geofencelist').remove({"clientID":req.query.clientID,"geofenceID":{'$in':req.query.geofenceIDs}}, function (err, geofences) {
        if (err!=null || geofences!=null){
            databaseResultHandler(res,err,geofences);
        }
        else databaseResultHandler(res,"No geofence data for clientID: "+req.query.clientID,"");
    });
});

/* This function will make the geofence callback if it is included in the client callback list
*  This keeps track of what objects are in what geofences by modifying the "geofence" parameter
*  of the object in the object list
*/
function geofenceCallback(req,host,path){

    var db = req.db;
    var body;
    if (req.method == 'POST' || req.method == 'DELETE'){
        body = req.body;
    } else body = req.query;

    //Ensure there is a 2dsphere index in the geofence list to allow for geoIntersects query
    db.collection('geofencelist').ensureIndex({'location':'2dsphere'}, function(err,result){
        if (err!=null){
            callbackErrorHandler(err);
        }
    });

    //First get the previous geofence information about this object
    db.collection('objectlist').findOne({'clientID':body.clientID,'customID':body.customID}, function(err,result){
        if (err!=null){
            callbackErrorHandler(err);
        }
        if (result!=null){
            var previousGeofences = [];
            if (result.geofences != null){
                previousGeofences = result.geofences;
            }
            // Then, find what geofences it is currently in
            
            db.collection('geofencelist').find({
                'location':{
                    '$geoIntersects': {
                        '$geometry': body.position.location
                    }
                },'clientID':body.clientID}).toArray(function(err, results){

                    if (err!=null){
                        callbackErrorHandler(err);
                    }
                    if (results!=null){

                        // This will keep track of what geofences the object is currently in, and choose whether to send the callback

                        // // Sort the geofences into entered, exited, and stillIn
                        // var entered = [];
                        // var exited = [];
                        // var stillIn = [];

                        // var resultsGeofences = results.map(function(item,index,array){
                        //     return item.geofenceID;
                        // });

                        // for (geofence in previousGeofences){
                        //     if (resultsGeofences.indexOf(previousGeofences[geofence]) > -1){
                        //         stillIn.push(previousGeofences[geofence]);
                        //     } else {
                        //         exited.push(previousGeofences[geofence]);
                        //     }
                        // }
                        // for (geofence in resultsGeofences){
                        //     console.log(previousGeofences.indexOf(resultsGeofences[geofence]))
                        //     if (previousGeofences.indexOf(resultsGeofences[geofence])> -1){ 
                        //     } else {
                        //         entered.push(resultsGeofences[geofence]);
                        //     }
                        // }

                        // //Update the object list with the stillIn+entered geofences
                        // db.collection('objectlist').update(
                        //     {'clientID':body.clientID, 'customID':body.customID},
                        //     {$set:{'geofences':stillIn.concat(entered)}},
                        //     function(err,result){
                        //         if (err != null) {
                        //             callbackErrorHandler(err);
                        //         } else{
                        //             //Only send callback if there is meaningful data
                        //             if (entered.length + exited.length > 0){
                        //                 console.log("Sending geofence callback");
                        //                 //Send the geofence callback request with the entered and exited geofence information
                        //                 var reqBody = {'customID':body.customID,'entered':entered,'exited':exited};
         
                        //                 sendRequest(host,path,reqBody);
                        //             }
                        //             else {
                        //                 console.log("Not sending geofence callback; no meaningful data to send");
                        //             }
                        //         }
                        //     }
                        // );


                        // This will always send the geofence callback for objects, even if they have been in the geofence for a long time

                        var resultsGeofences = results.map(function(item,index,array){
                            return item.geofenceID;
                        });
                        var reqBody = {'customID':body.customID,'entered':resultsGeofences};
                        sendRequest(host,path,reqBody);
                    }

                    else{
                        callbackErrorHandler("No geofence data");
                    }
                }
            );
        }
        else{
            callbackErrorHandler("No object data with customID: "+body.customID);
        }
    });
}

/* This function will mirror the save position posts if it is included in the client callback list
*/
function savePositionCallback(req, host, path){
    var db = req.db;
    var body;
    if (req.method == 'POST' || req.method == 'DELETE'){
        body = req.body;
    } else body = req.query;

    console.log("Sending savePosition callback");

    sendRequest(host,path,body);
}

// Check if there is a callback listed in our database for this clientID, 
// and if there is, then make the callback for this client
function makeCallback(req,type){
    var db = req.db;
    var body;
    if (req.method == 'POST' || req.method == 'DELETE'){
        body = req.body;
    } else body = req.query;
    db.collection('clientcallbacklist').findOne({'clientID':body.clientID}, function(err, result){
        if (err !=null){
            callbackErrorHandler(err);
        }
        if (result!=null){
            if (type == 'geofence' && result.geofence.isActive){
                geofenceCallback(req,result.geofence.host,result.geofence.path);
            }
            if (type == 'savePosition' && result.savePosition.isActive){
                savePositionCallback(req,result.savePosition.host,result.savePosition.path);
            }
        }
        else {
            console.log("Error with callback lookup:");
            console.log("Error: "+err);
            console.log("Results: "+result);
        }
    });
}

// Handle the result of a database call/throw an error
function databaseResultHandler(res,err,result){
    //console.log("Error: "+JSON.stringify(err));
    //console.log("Result: "+JSON.stringify(result));
    res.send(
        (err == null) ? { error:0, response:result } : { error:3, cause: err }
    );
}

// Handle the result of a callback error
function callbackErrorHandler(err){
    console.log('Error in callback: ');
    console.log(err);
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

function sanitizeStrings(body){
    traverseObject(body,function(item){
        if (typeof(item) == "string"){
            item = item.replace(/\s/g,'');
        }
        return item;
    });
}

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

function nearbyObjectsQuery(req,res,objects){
    var db = req.db;

    var params = [['location','coordinates'],['location','type'],'distance'];
    if (!checkParameters(req.query.near, res, params)) return;
    
    var offset;
    if (!req.query.near.offset){
        offset = 24*60*60; //set default offset to 24 hours if not given
    } else offset = parseFloat(req.query.near.offset);
    
    var epoch = (new Date).getTime() / 1000;
    var locQuery = {'clientID':req.clientID, 'position.time': {'$gte':epoch-offset}};
    var objectFields = {};
    var customIDs = [];
    var fields = ['tags','related','categories'];
    if (objects){
        for (object in objects){
            customIDs.push(objects[object].customID);
            objectFields[objects[object].customID] = {};
            for (field in fields){
                if (objects[object][fields[field]] != null){
                    objectFields[objects[object].customID][fields[field]]=objects[object][fields[field]];
                }
            }
        }
        locQuery['customID'] = {'$in':customIDs};
    }
    console.log(locQuery);

    req.query.near.location.coordinates = [parseFloat(req.query.near.location.coordinates[0]),parseFloat(req.query.near.location.coordinates[1])];

    //Run the geoNear command
    db.command({'geoNear': 'lastpositionlist',
        'near': req.query.near.location,
        'spherical':'true',
        'query': locQuery,
        'maxDistance':parseFloat(req.query.near.distance)}, function (err, positions) {

            if (err!=null){
                databaseResultHandler(res,err,positions);
            }
            else if (positions != null){
                console.log(positions);
                for (position in positions.results){
                    //clean up the results to return
                    if (req.body.customIDs){
                        if (req.body.customIDs.indexOf(positions.results[position].obj.customID)>-1){
                            delete positions.results[position];
                        } 
                    }
                    else {
                        console.log(fields);
                        for (field in fields){
                            if (objectFields[positions.results[position].obj.customID][fields[field]] != null){
                                positions.results[position].obj[fields[field]]=objectFields[positions.results[position].obj.customID][fields[field]];
                            }
                        }
                        delete positions.results[position].obj._id;
                    }
                }
                databaseResultHandler(res,err,positions.results);       
            }
            else databaseResultHandler(res,"No location data in database",""); 
    });
}

module.exports = router;