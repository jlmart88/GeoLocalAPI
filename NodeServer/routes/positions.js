var express = require('express');
var router = express.Router();
var requesthelper= require('./requesthelper');

/*
 * POST to positions.
 */
router.post('/:customID', function(req, res) {
    var db = req.db;

    //Check and sanitize the parameters
    req.body.clientID = req.clientID;
    req.body.customID = req.params.customID;
    var params = [['position','location','type'], ['position','location','coordinates'], ['position','time']];
    if (!requesthelper.checkParameters(req.body, res, params)) return;

    //Ensure the unique index in last position list
    db.collection('lastpositionlist').ensureIndex(
        {'clientID':1, 'customID':1}, 
        {unique:true}, 
        function(err,result){
            if (err != null) {
                requesthelper.callbackErrorHandler(err);
            }
        }
    );

    //Ensure the 2dsphere index in the last position list to allow for geoNear query
    db.collection('lastpositionlist').ensureIndex({'position.location':'2dsphere'}, function(err,result){
        if (err!=null){
            requesthelper.callbackErrorHandler(err);
        }
    });

    //Insert the location into the last position list first to see if it is newer
    db.collection('lastpositionlist').update(
                {'clientID':req.body.clientID, 'customID':req.body.customID, 'position.time': {$lt:req.body.position.time}},
                {'$set':req.body},
                {upsert:true},
                function(err,result){
                    if (err!=null){
                        requesthelper.databaseResultHandler(res,err,result);
                    }
                    //If the position went in successfully, then log it to the position list
                    else if (result != null){

                        //Insert the location into the position list
                        db.collection('positionlist').insert(req.body, function(err, result){
                            if (err != null) {
                                requesthelper.databaseResultHandler(res,err,result);
                            } else {
                                requesthelper.databaseResultHandler(res,err,result);
                                //Attempt the geofence callback after we know the position update was successful
                                makeCallback(req,'geofence');

                                //Attempt the save position callback after we know the position update was successful
                                makeCallback(req,'savePosition');
                            }
                        });
                    }
                    else requesthelper.databaseResultHandler(res,"Unknown error while saving position",result);
                }
    );
});

/*
 * GET to positions.
 */
router.get('/:customID', function(req, res) {
    var db = req.db;

    //Sanitize the parameters
    req.query.clientID = req.clientID;
    req.query.customID = req.params.customID;
    var last = req.query.last;
    delete req.query.last;
    requesthelper.checkParameters(req.query, res);

    //If we only want the most recent position
    if (last){
        //First query the object list for the object information
        db.collection('objectlist').findOne(req.query, function (err, object) {
            if (err!=null){
                requesthelper.databaseResultHandler(res,err,object);
            }
            else if (object != null){
                //Then query the last position list
                db.collection('lastpositionlist').findOne(req.query, function(err, position){
                    if (err!=null){
                        requesthelper.databaseResultHandler(res,err,position);
                    }
                    //Add the position data to our object and return it
                    else if (position!=null){
                        delete position.clientID;
                        delete position.customID;
                        object.position = position.position;
                    } else requesthelper.databaseResultHandler(res,"No position data for object with customID: "+req.query.customID,"");
                    delete object._id;
                    requesthelper.databaseResultHandler(res,err,object);
                });
            }
            else requesthelper.databaseResultHandler(res,"No object data for object with customID: "+req.query.customID,"");
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
                requesthelper.databaseResultHandler(res,err,items);
            }
            else if (items != null){
                var results = [];
                items.forEach(function(item) {
                    results.push(item.position);
                })
                requesthelper.databaseResultHandler(res,err,results);
            } else requesthelper.databaseResultHandler(res,"No object data for object with customID "+customID,"");
        });
    }
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
            requesthelper.callbackErrorHandler(err);
        }
    });

    //First get the previous geofence information about this object
    db.collection('objectlist').findOne({'clientID':body.clientID,'customID':body.customID}, function(err,result){
        if (err!=null){
            requesthelper.callbackErrorHandler(err);
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
                        requesthelper.callbackErrorHandler(err);
                    }
                    if (results!=null){

                        // This will keep track of what geofences the object is currently in, and choose whether to send the callback

                        // Sort the geofences into entered, exited, and stillIn
                        var entered = [];
                        var exited = [];
                        var stillIn = [];

                        var resultsGeofences = results.map(function(item,index,array){
                            return item.geofenceID;
                        });

                        for (geofence in previousGeofences){
                            if (resultsGeofences.indexOf(previousGeofences[geofence]) > -1){
                                stillIn.push(previousGeofences[geofence]);
                            } else {
                                exited.push(previousGeofences[geofence]);
                            }
                        }
                        for (geofence in resultsGeofences){
                            console.log(previousGeofences.indexOf(resultsGeofences[geofence]))
                            if (previousGeofences.indexOf(resultsGeofences[geofence])> -1){ 
                            } else {
                                entered.push(resultsGeofences[geofence]);
                            }
                        }

                        //Update the object list with the stillIn+entered geofences
                        db.collection('objectlist').update(
                            {'clientID':body.clientID, 'customID':body.customID},
                            {$set:{'geofences':stillIn.concat(entered)}},
                            function(err,result){
                                if (err != null) {
                                    requesthelper.callbackErrorHandler(err);
                                } else{
                                    //Only send callback if there is meaningful data
                                    if (entered.length + exited.length > 0){
                                        console.log("Sending geofence callback");
                                        //Send the geofence callback request with the entered and exited geofence information
                                        var reqBody = {'customID':body.customID,'entered':entered,'exited':exited};
         
                                        requesthelper.sendRequest(host,path,reqBody);
                                    }
                                    else {
                                        console.log("Not sending geofence callback; no meaningful data to send");
                                    }
                                }
                            }
                        );


                        // This will always send the geofence callback for objects, even if they have been in the geofence for a long time

                        // var resultsGeofences = results.map(function(item,index,array){
                        //     return item.geofenceID;
                        // });
                        // var reqBody = {'customID':body.customID,'entered':resultsGeofences};
                        // requesthelper.sendRequest(host,path,reqBody);
                    }

                    else{
                        requesthelper.callbackErrorHandler("No geofence data");
                    }
                }
            );
        }
        else{
            requesthelper.callbackErrorHandler("No object data with customID: "+body.customID);
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

    requesthelper.sendRequest(host,path,body);
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
            requesthelper.callbackErrorHandler(err);
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

module.exports = router;
