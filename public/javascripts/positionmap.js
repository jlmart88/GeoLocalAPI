var clientSecret = "nomelase";
var markerArray = [];

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

                console.log(response);
                for (marker in markerArray){
                    markerArray[marker].setMap(null);
                }
                while (markerArray.length>0){
                    markerArray.pop();
                }
                var mapOptions = {
                    center: new google.maps.LatLng(0, 0),
                    zoom: 10
                    };
                var map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
                var latLngBounds = new google.maps.LatLngBounds();
                for (position in response){
                    console.log(response[position]);
                    var lat = response[position].location.coordinates[1];
                    var lng = response[position].location.coordinates[0];
                    console.log('here');
                    var myLatlng = new google.maps.LatLng(lat,lng);
                    latLngBounds.extend(myLatlng);

                    var marker = new google.maps.Marker({
                        position: myLatlng,
                        title:"Hello World!"
                    });

                    // To add the marker to the map, call setMap();
                    marker.setMap(map);

                    markerArray.push(marker);
                }
                if (response.length>0){
                    if (response.length>1){
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
