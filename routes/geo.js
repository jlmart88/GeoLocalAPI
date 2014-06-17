var express = require('express');
var router = express.Router();
var async = require('async');
var http = require('http');

/*
 * POST to addobject.
 */
router.post('/addobject', function(req, res) {
    var db = req.db;
    //Insert the object into the object list
    db.collection('objectlist').insert(req.body, function(err, result){
        databaseResultHandler(res,err,result);
    });
});

/*
 * POST to saveposition.
 */
router.post('/saveposition', function(req, res) {
    var db = req.db;
    //Insert the location into the position list first
    db.collection('positionlist').insert(req.body, function(err, result){
        var clientID = result[0].clientID;
        var customID = result[0].customID;

        var time = result[0].position.time;
        console.log(result[0].position);
        delete result[0]._id;

        //Then insert the location into the last position list
        db.collection('lastpositionlist').ensureIndex(
            {'clientID':1, 'customID':1}, 
            {unique:true}, 
            function(err,result){
                if (err != null) {
                    callbackErrorHandler(err);
                }
            });
        db.collection('lastpositionlist').update(
            {'clientID':clientID, 'customID':customID, 'position.time': {$lt:time}},
            {'$set':result[0]},
            {upsert:true},
            function(err,result){
                if (err != null) {
                    callbackErrorHandler(err);
                }else {
                    //Attempt the geofence callback after we know the last position update was successful
                    makeCallback(req,'geofence');
                }
            });
        
        databaseResultHandler(res,err,result);
    });
});

/*
 * GET lastPosition.
 */
router.get('/lastposition', function(req, res) {
    var db = req.db;
    //First query the object collection
    db.collection('objectlist').findOne(req.query, function (err, object) {
        if (err!=null){
            databaseResultHandler(res,err,object);
        }
        if (object != null){
            //Then query the position collection, sorting by the timestamp
            db.collection('lastpositionlist').findOne(req.query, function(err, position){
                if (err!=null){
                    databaseResultHandler(res,err,position);
                }
                //Add the position data to our object and return it
                if (position!=null){
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
});

/*
 * GET nearbyObjects.
 */
router.get('/nearbyobjects', function(req, res) {
    var db = req.db;
    var clientID = req.query.clientID;
    var customID = req.query.customID;
    var offset;
    var epoch = (new Date).getTime() / 1000;

    if (req.query.offset == ''){
        offset = 24*60*60; //set default offset to 24 hours
    } else offset = parseFloat(req.query.offset);

    //Create a 2dsphere index in the last position list to allow for geoNear query
    db.collection('lastpositionlist').ensureIndex({'position.location':'2dsphere'}, function(err,result){
        if (err!=null){
            databaseResultHandler(res,err,result);
        }
    });
 
    req.query.location.coordinates = [parseFloat(req.query.location.coordinates[0]),parseFloat(req.query.location.coordinates[1])];
    
    //Run the geoNear command
    db.command({geoNear: 'lastpositionlist',
        near: req.query.location,
        spherical:'true',
        query: {'position.time': {$gte:epoch-offset}},
        maxDistance:parseFloat(req.query.distance)}, function (err, positions) {
            if (err!=null){
            databaseResultHandler(res,err,positions);
            }
            
            // larger scope array to hold the augmented data we will create
            var results = [];

            if (positions != null){
                //Augment all of the results with information about the objects from the object database
                async.each(positions.results, function(position, callback){
                    if (!(position.obj.clientID == clientID && position.obj.customID == customID)){

                        db.collection('objectlist').findOne({'clientID':position.obj.clientID, 'customID':position.obj.customID}, function (err, object) {
                            if (err!=null){
                                databaseResultHandler(res,err,object);
                            }
                            if (object!=null){
                                position.obj.categories = object.categories;
                                position.obj.tags = object.tags;
                                position.obj.related = object.related;
                                delete position.obj._id;
                            } else callback("No object data for object with customID "+customID,"");
                            results.push(position);
                            callback();
                        });
                    
                    } else callback();


                }, function(err){
                    //Check for a callback associated with this clientID/request
                    makeCallback(req);
                    console.log(results);
                    databaseResultHandler(res,err,results);
                });
                
                
            } else databaseResultHandler(res,"No position data in database","");
        }
    );
});

/*
 * GET objectPath.
 */
router.get('/objectpath', function(req, res) {
    var db = req.db;
    var start;
    var end;
    var epoch = (new Date).getTime() / 1000;

    if (req.query.start == ''){
        start = epoch - 24*60*60; //set default start to 24 hours ago
    } else start = parseFloat(req.query.start);

    if (req.query.end == ''){
        end = epoch; //set default end to now
    } else end = parseFloat(req.query.end);

    //Format the query to include the range of time
    delete req.query.start;
    delete req.query.end;
    var time = 'position.time'
    req.query[time] = {"$gte":start, "$lte":end};

    //Query the position collection
    db.collection('positionlist').find(req.query).sort({'position.time':1}).toArray(function (err, items) {
        if (err != null){
            databaseResultHandler(res,err,items);
        }
        if (items != null){
            var results = [];
            items.forEach(function(item) {
                results.push(item.position);
            })
            databaseResultHandler(res,err,results);
        } else databaseResultHandler(res,"No object data for object with customID "+customID,"");
    });
});

/*
 * POST to geofence.
 */
router.post('/geofence', function(req, res) {
    var db = req.db;
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
    
    var object = {
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

    //Insert the object into the object list
    db.collection('geofencelist').insert(object, function(err, result){
        databaseResultHandler(res,err,result);
    });
});

/*
 * GET geofence.
 */
router.get('/geofence', function(req, res) {
    var db = req.db;
    console.log(req.query)

    //First query the object collection
    db.collection('geofencelist').find(req.query).toArray(function (err, geofences) {
        if (err!=null || geofences!=null){
            databaseResultHandler(res,err,geofences);
        }
        else databaseResultHandler(res,"No geofence data for clientID: "+req.query.clientID,"");
    });
});

/*
 * DELETE geofence.
 */
router.delete('/geofence', function(req, res) {
    var db = req.db;
    console.log(req.query)

    //First query the object collection
    db.collection('geofencelist').remove(req.query, function (err, geofences) {
        if (err!=null || geofences!=null){
            databaseResultHandler(res,err,geofences);
        }
        else databaseResultHandler(res,"No geofence data for clientID: "+req.query.clientID,"");
    });
});

//This function will make the geofence callback if it is included in the client callback list
//This keeps track of what objects are in what geofences by modifying the "geofence" parameter
//  of the object in the object list
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
                        // Sort the geofences into entered, exited, and stillIn
                        var entered = [];
                        var exited = [];
                        var stillIn = [];

                        var resultsGeofences = results.map(function(item,index,array){
                            return item.geofenceID;
                        });

                        for (geofence in previousGeofences){
                            if (resultsGeofences.indexOf(previousGeofences[geofence]) > -1){
                                console.log("Pushing to stillIn: "+previousGeofences[geofence]);
                                stillIn.push(previousGeofences[geofence]);
                            } else {
                                console.log("Pushing to exited: "+previousGeofences[geofence]);
                                exited.push(previousGeofences[geofence]);
                            }
                        }
                        for (geofence in resultsGeofences){
                            console.log(previousGeofences.indexOf(resultsGeofences[geofence]))
                            if (previousGeofences.indexOf(resultsGeofences[geofence])> -1){ 
                            } else {
                                console.log("Pushing to entered: "+resultsGeofences[geofence]);
                                entered.push(resultsGeofences[geofence]);
                            }
                        }

                        //Update the object list with the stillIn+entered geofences
                        db.collection('objectlist').update(
                            {'clientID':body.clientID, 'customID':body.customID},
                            {$set:{'geofences':stillIn.concat(entered)}},
                            function(err,result){
                                if (err != null) {
                                    callbackErrorHandler(err);
                                } else{
                                    //Send the geofence callback request with the entered and exited geofence information
                                    sendRequest(host,path,{'customID':body.customID,'entered':entered,'exited':exited});
                                }
                            }
                        );
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

function objectPathCallback(req, host, path){}

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
            databaseResultHandler(res,err,result);
        }
        if (result!=null){
            if (type == 'geofence' && result.geofence.isActive){
                geofenceCallback(req,result.geofence.host,result.geofence.path);
            }
            if (type == 'objectPath' && result.objectPath.isActive){
                objectPathCallback(req,result.objectPath.host,result.objectPath.path);
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

function callbackErrorHandler(err){
    console.log('Error in callback: '+JSON.stringify(err));
}

function sendRequest(host,path,body){
    var options = {
        host: host,
        path: path,
        method: "POST"
    };

    var request = http.request(options, function(res) {
        //Do something with the response if necessary, for now just log it
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
    console.log(request);
    request.end();
}

module.exports = router;