var express = require('express');
var router = express.Router();
var async = require('async');
var crypto = require('crypto');

/*
 * POST to addobject.
 */
router.post('/addobject', function(req, res) {
    verifySignature(req, function(err,verify){
        if (verify){
            var db = req.db;
            db.collection('objectlist').insert(req.body, function(err, result){
                res.send(
                    (err === null) ? { msg: '' } : { msg: err }
                );
            });
        } else res.send({msg:"Unauthorized request"});
    });
});

/*
 * POST to saveposition.
 */
router.post('/saveposition', function(req, res) {
    verifySignature(req, function(err,verify){
        if (verify){
            var db = req.db;
            db.collection('positionlist').insert(req.body, function(err, result){
                var clientID = result[0].clientID;
                var customID = result[0].customID;
                var time = result[0].position.time;
                delete result[0]._id;
                db.collection('lastpositionlist').ensureIndex({'clientID':1, 'customID':1}, {unique:true}, function(err,replies){ });
                db.collection('lastpositionlist').update(
                    {'clientID':clientID, 'customID':customID, 'position.time': {$lte:time}},
                    result[0],
                    {upsert:true},
                    function(err, result){
                    });
                res.send(
                    (err === null) ? { msg: '' } : { msg: err }
                );
            });
        } else res.send({msg:"Unauthorized request"});
    });
});

/*
 * GET lastPosition.
 */
router.get('/lastposition', function(req, res) {
    verifySignature(req, function(err,verify){
        if (verify){
            var db = req.db;

            //First query the object collection
            db.collection('objectlist').findOne(req.query, function (err, object) {
                if (object != null){
                    //Then query the position collection, sorting by the timestamp
                    db.collection('lastpositionlist').findOne(req.query, function(err, position){
                        //Add the position data and return the object
                        if (position!=null){
			    delete position.clientID;
			    delete position.customID;
                            object.position = position;
                        } else object.position = 'No position data in database';
                        res.json(object);
                    });
                }
                else res.send({msg:'No object in database'});
            });
        } else res.send({msg:"Unauthorized request"});
    });
});

/*
 * GET nearbyObjects.
 */
router.get('/nearbyobjects', function(req, res) {
    verifySignature(req, function(err,verify){
        if (verify){
            var db = req.db;
            var clientID = req.query.clientID;
            var customID = req.query.customID;
            var offset;
            var epoch = (new Date).getTime() / 1000;

            if (req.query.offset == ''){
                offset = 24*60*60; //set default offset to 24 hours
            } else offset = parseFloat(req.query.offset);

            //Create a 2dsphere index in MongoDB
            db.collection('lastpositionlist').ensureIndex({'position.location':'2dsphere'}, function(err,replies){});
         
            req.query.location.coordinates = [parseFloat(req.query.location.coordinates[0]),parseFloat(req.query.location.coordinates[1])];
            
            //Run the geoNear command
            db.command({geoNear: 'lastpositionlist',
                near: req.query.location,
                spherical:'true',
                query: {'position.time': {$gte:epoch-offset}},
                maxDistance:parseFloat(req.query.distance)}, function (err, positions) {
                    
                    // larger scope array to hold the augmented data we will create
                    var results = [];

                    if (positions != null){
                        //Augment all of the results with information about the objects from the object database
                        async.each(positions.results, function(position, callback){
                            if (!(position.obj.clientID == clientID && position.obj.customID == customID)){

                                db.collection('objectlist').findOne({'clientID':position.obj.clientID, 'customID':position.obj.customID}, function (err, object) {
                                    if (object!=null){

                                        position.obj.categories = object.categories;
                                        position.obj.tags = object.tags;
                                        position.obj.related = object.related;
                                    } else position.obj.msg = "No object in database";
                                    results.push(position);
                                    callback();
                                });
                            
                            } else callback();


                        }, function(err){
                            res.json(results);
                        });
                        
                        
                    } else res.send({msg:'No positions in database'});
                }
            );
        } else res.send({msg:"Unauthorized request"});
    });
});

/*
 * GET objectPath.
 */
router.get('/objectPath', function(req, res) {
    verifySignature(req, function(err,verify){
        if (verify){
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
                if (items != null){
                    var results = [];
                    items.forEach(function(item) {
                        results.push(item.position);
                    })
                    res.json(results);
                } else res.send({msg:'No object in database'});
            });
        } else res.send({msg:"Unauthorized request"});
    });
});

function verifySignature(req, callback){
    var db = req.db;
    var body;
    //console.log(req);	
    if (req.method == 'POST'){
        body = req.body;
    } else body = req.query;
    db.collection('clientidlist').findOne({'clientID':body.clientID}, function(err, result){
        if (err==null && result!=null){
            console.log("Server-side String:");
		console.log(JSON.stringify(body)+req.headers['x-timestamp']+result.clientSecret);
		
		var signature = crypto.createHash(req.headers['x-authentication-type']).update(
                    JSON.stringify(body)+req.headers['x-timestamp']+result.clientSecret).digest('hex');
            	console.log("Server-side Hash:");
		console.log(signature);
		console.log("Received Signature:");
		console.log(req.headers['x-signature']);
        	console.log("Received Time:");
		console.log(parseFloat(req.headers['x-timestamp'])*1000);
		console.log("Current Server Time:");
		console.log((new Date).getTime());
		console.log("Time Difference:");
		console.log((new Date).getTime() - parseFloat(req.headers['x-timestamp'])*1000);    
	//Check that the signature is correct and the request is less than 5 minutes old
            var expireTime = 1000*60*5;
            callback(null,(signature == req.headers['x-signature'] && 
                (new Date).getTime() - parseFloat(req.headers['x-timestamp'])*1000 < expireTime));
        }
        else {
            callback(null,false);
        }
    });
}

module.exports = router;
