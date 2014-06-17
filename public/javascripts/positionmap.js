var clientSecret = "nomelase";
var markerArray = [];
var polylineArray = [];

// DOM Ready =============================================================
$(document).ready(function() {

    // Object Path button click
    $('#btnObjectPath').on('click', objectPath);

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

                var mapOptions = {
                    zoom: 8,
                    center: new google.maps.LatLng(0, -180),
                };

                var map = new google.maps.Map(document.getElementById('map-canvas'),
                    mapOptions);
                //Create a bounds to set our map view to after we are finished
                var latLngBounds = new google.maps.LatLngBounds();

                //Clear the old polyline array
                while (polylineArray.length>0){
                    polylineArray.pop();
                }

                //Clear the old marker array
                for (marker in markerArray){
                    markerArray[marker].setMap(null);
                }
                while (markerArray.length>0){
                    markerArray.pop();
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
                    marker.setMap(map);

                    markerArray.push(marker);
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
                path.setMap(map);

                //Set the bounds of the map view depending on whether we have a path or a single point
                if (response.response.length>0){
                    if (response.response.length>1){
                        map.fitBounds(latLngBounds);
                    } else {
                        map.setCenter(myLatlng);
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
