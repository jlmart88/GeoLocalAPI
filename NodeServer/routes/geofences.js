var express = require('express');
var router = express.Router();
var requesthelper= require('./requesthelper');

/*
 * POST to geofences.
 */
router.post('/:geofenceID', function(req, res) {
    var db = req.db;

    //Check and sanitize the parameters
    req.body.clientID = req.clientID;
    req.body.geofenceID = req.params.geofenceID;
    var params = ['lng','lat','distance'];
    if (!requesthelper.checkParameters(req.body, res, params)) return;


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
                requesthelper.callbackErrorHandler(err);
            }
        }
    );

    //Ensure there is a 2dsphere index in the geofence list to allow for geoIntersects query
    db.collection('geofencelist').ensureIndex({'location':'2dsphere'}, function(err,result){
        if (err!=null){
            requesthelper.callbackErrorHandler(err);
        }
    });

    //Insert the geofence into the geofence list
    db.collection('geofencelist').insert(geofence, function(err, result){
        requesthelper.databaseResultHandler(res,err,result);
    });
});

/*
 * GET geofences.
 */
router.get('/', function(req, res) {
    var db = req.db;

    //Sanitize the parameters
    req.query.clientID = req.clientID;
    requesthelper.checkParameters(req.query, res);


    //Query the geofence collection
    db.collection('geofencelist').find(req.query).toArray(function (err, geofences) {
        if (err!=null){
            requesthelper.databaseResultHandler(res,err,geofences);
        }
        else if (geofences!=null){
            geofences.forEach(function(geofence){
                delete geofence._id;
            });
            requesthelper.databaseResultHandler(res,err,geofences);
        }
        else requesthelper.databaseResultHandler(res,"No geofence data for clientID: "+req.query.clientID,"");
    });
});

/*
 * DELETE geofences.
 */
router.delete('/:geofenceIDs', function(req, res) {
    var db = req.db;

    //Sanitize the parameters
    req.query.clientID = req.clientID;
    req.query.geofenceIDs = req.params.geofenceIDs.split(",");
    requesthelper.checkParameters(req.query, res);

    //Delete the geofences from the list
    db.collection('geofencelist').remove({"clientID":req.query.clientID,"geofenceID":{'$in':req.query.geofenceIDs}}, function (err, geofences) {
        if (err!=null || geofences!=null){
            requesthelper.databaseResultHandler(res,err,geofences);
        }
        else requesthelper.databaseResultHandler(res,"No geofence data for clientID: "+req.query.clientID,"");
    });
});

module.exports = router;
