/* Node.js Express Engine for GeoLocalization API
*  TechIDEAS
*  Justin Martinez
*/

var express = require('express');
var router = express.Router();

var objects = require('./objects');
var positions = require('./positions');
var geofences = require('./geofences');

router.use('/objects', objects);
router.use('/positions', positions);
router.use('/geofences', geofences);

module.exports = router;