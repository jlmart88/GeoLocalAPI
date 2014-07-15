var express = require('express');
var router = express.Router();
var requesthelper= require('./requesthelper');

/*
 * POST to objects.
 */
router.post('/:customIDs', function(req, res) {
    var db = req.db;

    //place these values in req.body to perform string sanitizing
    req.body.clientID = req.clientID;
    req.body.customIDs = req.params.customIDs.split(",");
    requesthelper.checkParameters(req.body,res);

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
                requesthelper.callbackErrorHandler(err);
            }
        }
    );
    
    //Insert the objects into the object list
    db.collection('objectlist').insert(objects,{'continueOnError':true}, function(err, result){
        requesthelper.databaseResultHandler(res,err,result);
    });
});

/*
 * PUT to objects.
 */
router.put('/:customIDs', function(req, res) {
    var db = req.db;

    //place these values in req.body to perform string sanitizing
    req.body.clientID = req.clientID;
    req.body.customIDs = req.params.customIDs.split(",");
    requesthelper.checkParameters(req.body,res);

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
            requesthelper.databaseResultHandler(res,err,result);
    });
});


/*
 * GET to objects.
 */
router.get('/:customIDs?', function(req, res) {
    var db = req.db;

    //place these values in req.body to perform string sanitizing
    req.body.clientID = req.clientID;
    if (req.params.customIDs){
        req.body.customIDs = req.params.customIDs.split(",");
    }
    requesthelper.checkParameters(req.body,res);
    requesthelper.checkParameters(req.query,res);

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
                requesthelper.databaseResultHandler(res,err,objects);
            }
            else if (objects!=null){
                //if we have a near parameter, get the position information for the nearby objects
                if (req.query.near){
                    nearbyObjectsQuery(req,res,objects);
                }
                //otherwise just return the object information
                else requesthelper.databaseResultHandler(res,err,objects);
            }
            else {
                requesthelper.databaseResultHandler(res,"No object data in database","");
            }   
        });
    }
    //if there's no filters, then just return object information
    else {
        var query = {'clientID':req.body.clientID};
        if (req.params.customIDs){
            req.body.customIDs = req.params.customIDs.split(",");
            requesthelper.checkParameters(req.body,res);
            query.customID = {'$in':req.body.customIDs};
        }

        db.collection('objectlist').find(query).toArray(function(err, objects) {
        if (err!=null){
            requesthelper.databaseResultHandler(res,err,objects);
        }
        else if (objects!=null){
            requesthelper.databaseResultHandler(res,err,objects);
        }
        else requesthelper.databaseResultHandler(res,"No object data in database","");
        });
    }
});

/*
 * DELETE to objects.
 */
router.delete('/:customIDs', function(req, res) {
    var db = req.db;
    //sanitize the parameters before adding the customIDs
    requesthelper.checkParameters(req.query,res);

    //check to see if our query is empty, so we know whether to delete the objects
    var deleteObject = true;
    for (var key in req.query) {
        if (hasOwnProperty.call(req.query, key)) deleteObject = false;
    }

    //add these parameters to the query and resanitize
    req.query.clientID = req.clientID;
    req.query.customIDs = req.params.customIDs.split(",");
    requesthelper.checkParameters(req.query,res);

    //if our query was empty, delete the given objects
    if (deleteObject){
        db.collection('objectlist').remove({"clientID":req.query.clientID,"customID":{'$in':req.query.customIDs}}, function(err, result){
            requesthelper.databaseResultHandler(res,err,result);
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
            requesthelper.databaseResultHandler(res,err,result);
        });
    }
});

// Helper method for performing GET /objects, where the 'near' query is specified
function nearbyObjectsQuery(req,res,objects){
    var db = req.db;

    var params = [['location','coordinates'],['location','type'],'distance'];
    if (!requesthelper.checkParameters(req.query.near, res, params)) return;
    
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
                requesthelper.databaseResultHandler(res,err,positions);
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
                requesthelper.databaseResultHandler(res,err,positions.results);       
            }
            else requesthelper.databaseResultHandler(res,"No location data in database",""); 
    });
}

module.exports = router;
