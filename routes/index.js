var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'GeoLocalization API' });
});

router.get('/positionmap', function(req,res) {
    res.render('positionmap', { title: 'Object Path and Geofence Mapper'});
});

module.exports = router;