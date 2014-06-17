var clientSecret = "nomelase";
window.markerArray = [];
window.pathArray = [];
window.geofenceArray = [];

// DOM Ready =============================================================
$(document).ready(function() {


    function initialize() {
        var mapOptions = {
            center: new google.maps.LatLng(41.387, 2.168),
            zoom: 12
        };
        window.map = new google.maps.Map(document.getElementById("map-canvas"),
            mapOptions);

        // Object Path button click
        $('#btnObjectPath').on('click', objectPath);

        // List Geofences button click
        $('#btnListGeofences').on('click', listGeofences);
    }

    google.maps.event.addDomListener(window, 'load', initialize);

});

// Functions =============================================================

function objectPath(event) {
    event.preventDefault();

    // Super basic validation - increase errorCount variable if any fields are blank
    var errorCount = 0;
    $('#objectPath input').each(function(index, val) {

        if($(this).val() === '') { 
            // Allow start and end to be empty
            if($(this).context.id != 'inputStart' && $(this).context.id != 'inputEnd') {
                errorCount++; 
            }
        }
    });

    // Check and make sure errorCount's still at zero
    if(errorCount === 0) {

        var newObject = {
            'clientID': $('#objectPath fieldset input#inputClientID').val(),
            'customID': $('#objectPath fieldset input#inputCustomID').val(),
            'start': $('#objectPath fieldset input#inputStart').val(),
            'end': $('#objectPath fieldset input#inputEnd').val()
        };

        var dataString = JSON.stringify(newObject);
        var timeString = (new Date).getTime()/1000;
        var signature = CryptoJS.SHA1(dataString+timeString+clientSecret);

        // Use AJAX to post the object to our service
        $.ajax({
            type: 'GET',
            data: newObject,
            url: '/geo/objectPath',
            dataType: 'JSON',
            contentType: 'application/json',
            headers:{
                'X-Signature':signature,
                'X-Authentication-Type':'SHA1',
                'X-Timestamp':timeString
            }
        }).done(function( response ) {

                //Draw the path on the map as Markers and a Polyline

                //Create a bounds to set our map view to after we are finished
                var latLngBounds = new google.maps.LatLngBounds();
                var polylineArray = [];

                //Clear the old polyline array
                for (path in window.pathArray){
                    window.pathArray[path].setMap(null);
                }
                while (window.pathArray.length>0){
                    window.pathArray.pop();
                }

                //Clear the old marker array
                for (marker in window.markerArray){
                    window.markerArray[marker].setMap(null);
                }
                while (window.markerArray.length>0){
                    window.markerArray.pop();
                } 

                //Iterate through responses, creating markers and polyline points
                for (position in response.response){
                    console.log(response.response[position]);
                    var lat = response.response[position].location.coordinates[1];
                    var lng = response.response[position].location.coordinates[0];
                    var time = response.response[position].time;

                    var timeString = (new Date(time*1000)).toLocaleString();

                    var myLatlng = new google.maps.LatLng(lat,lng);
                    //Extend our map view to include this new location
                    latLngBounds.extend(myLatlng);

                    var marker = new google.maps.Marker({
                        animation: google.maps.Animation.DROP,
                        position: myLatlng,
                        title: timeString
                    });

                    // To add the marker to the map, call setMap();
                    marker.setMap(window.map);

                    window.markerArray.push(marker);
                    polylineArray.push(myLatlng);
                }
                //Create the polyline from the list of collected points

                 var lineSymbol = {
                    path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW
                  };

                var path = new google.maps.Polyline({
                    path: polylineArray,
                    icons: [{
                        icon: lineSymbol,
                        offset: '100%',
                        repeat: '50%'
                    }],
                    geodesic: true,
                    strokeColor: '#FF0000',
                    strokeOpacity: 1.0,
                    strokeWeight: 2
                });

                //To add the polyline to the map, call setMap();
                path.setMap(window.map);
                pathArray.push(path);

                //Set the bounds of the map view depending on whether we have a path or a single point
                if (response.response.length>0){
                    if (response.response.length>1){
                        window.map.fitBounds(latLngBounds);
                    } else {
                        window.map.setCenter(myLatlng);
                    }
                }
        });
    }
    else {
        // If errorCount is more than 0, error out
        alert('Please fill in all fields');
        return false;
    }
}

// List geofences
function listGeofences(event) {
    event.preventDefault();

    // Super basic validation - increase errorCount variable if any fields are blank
    var errorCount = 0;
    $('#listGeofences input').each(function(index, val) {
        if($(this).val() === '') { errorCount++; }
    });

    // Check and make sure errorCount's still at zero
    if(errorCount === 0) {

        var newObject = {
            'clientID': $('#listGeofences fieldset input#inputClientID').val()
        };

        var dataString = JSON.stringify(newObject);
        var timeString = (new Date).getTime()/1000;
        var signature = CryptoJS.SHA1(dataString+timeString+clientSecret);

        // Use AJAX to post the object to our service
        $.ajax({
            type: 'GET',
            data: newObject,
            url: '/geo/geofence',
            dataType: 'JSON',
            headers:{
                'X-Signature':signature,
                'X-Authentication-Type':'SHA1',
                'X-Timestamp':timeString
            }
        }).done(function( response ) {

            //Draw the geofences on the map as Polygons


            //Create a bounds to set our map view to after we are finished
            var latLngBounds = new google.maps.LatLngBounds();

            //Clear the old geofence array
            for (geofence in window.geofenceArray){
                window.geofenceArray[geofence].setMap(null);
            }
            while (window.geofenceArray.length>0){
                window.geofenceArray.pop();
            }

            //Iterate through responses, creating markers and polyline points
            for (geofence in response.response){
                console.log(response.response[geofence]);
                var latLngArray = [];
                var coordinates = response.response[geofence].location.coordinates[0];
                for (coordinate in coordinates){
                    var myLatlng = new google.maps.LatLng(coordinates[coordinate][1],coordinates[coordinate][0]);
                    //Extend our map view to include this new location
                    latLngBounds.extend(myLatlng);
                    latLngArray.push(myLatlng);
                }

                var polygon = new google.maps.Polygon({
                    paths: latLngArray,
                    strokeColor: '#FF9933',
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                    fillColor: '#FF9933',
                    fillOpacity: 0.25
                });


                // To add the marker to the map, call setMap();
                polygon.setMap(window.map);

                window.geofenceArray.push(polygon);
            }

            //Set the bounds of the map view 
            window.map.fitBounds(latLngBounds);

        });
    }
    else {
        // If errorCount is more than 0, error out
        alert('Please fill in all fields');
        return false;
    }
};