var clientSecret = "nomelase";
window.drawingList = {};

// DOM Ready =============================================================
$(document).ready(function() {
    var drawingCounter = 0;
    var $drawingLists = $('.drawingList');
    var $objectList = $('#objectList');
    var $geofenceList = $('#geofenceList');
    var defaultMapOptions ={
            center: new google.maps.LatLng(41.387, 2.168),
            zoom: 12
        };


    function initialize() {
        window.map = new google.maps.Map(document.getElementById("map-canvas"),
            defaultMapOptions);
    }

    google.maps.event.addDomListener(window, 'load', initialize);

 // Object Path button click
    $('#btnObjectPath').on('click', objectPath);

    // List Geofences button click
    $('#btnListGeofences').on('click', listGeofences);

    $drawingLists.delegate('li', 'mouseover mouseout', function(event) {
        var $this = $(this).find('a');
         
        if(event.type === 'mouseover') {
            $this.stop(true, true).fadeIn();
        } else {
            $this.stop(true, true).fadeOut();
        }
    });

    $drawingLists.delegate("a", "click", function(e) {
        e.preventDefault();
        var $this = $(this);
     
        deleteDrawingItem($this);
    });

    $drawingLists.delegate('input', 'change', function(e){
        e.preventDefault();
        var $this = $(this);
     
        toggleVisibility($this);
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
                    var latLngBounds = window.map.getBounds();
                    var extended = false;
                    var polylineArray = [];
                    var markerArray = [];

                    //Iterate through responses, creating markers and polyline points
                    for (position in response.response){
                        var lat = response.response[position].location.coordinates[1];
                        var lng = response.response[position].location.coordinates[0];
                        var time = response.response[position].time;

                        var timeString = (new Date(time*1000)).toLocaleString();

                        var myLatlng = new google.maps.LatLng(lat,lng);
                        //Extend our map view to include this new location
                        if (!(latLngBounds.contains(myLatlng))){
                            latLngBounds.extend(myLatlng);
                            extended = true;
                        }

                        var marker = new google.maps.Marker({
                            animation: google.maps.Animation.DROP,
                            position: myLatlng,
                            title: timeString
                        });

                        // To add the marker to the map, call setMap();
                        marker.setMap(window.map);

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
                    path.setMap(window.map);

                    addDrawingItem($objectList,$('#objectPath fieldset input#inputCustomID').val(),markerArray.concat(path));

                    //Set the bounds of the map view depending on whether we have a path or a single point
                    if (response.response.length>0){
                        if ((response.response.length>1 && extended) || extended){
                            window.map.fitBounds(latLngBounds);
                        } else if (response.response.length==1){
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
    };

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
                var latLngBounds = window.map.getBounds();
                var extended = false;

                //Iterate through responses, creating markers and polyline points
                for (geofence in response.response){
                    var latLngArray = [];
                    var coordinates = response.response[geofence].location.coordinates[0];
                    for (coordinate in coordinates){
                        var myLatlng = new google.maps.LatLng(coordinates[coordinate][1],coordinates[coordinate][0]);
                        //Extend our map view to include this new location
                        if (!(latLngBounds.contains(myLatlng))){
                            latLngBounds.extend(myLatlng);
                            extended = true;
                        }
                        
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

                    addDrawingItem($geofenceList,response.response[geofence].geofenceID,[polygon]);
                }

                //Set the bounds of the map view
                if (extended){
                    window.map.fitBounds(latLngBounds);
                }
                

            });
        }
        else {
            // If errorCount is more than 0, error out
            alert('Please fill in all fields');
            return false;
        }
    };

    function addDrawingItem($list,name,mapContents){
        $list.append(
            "<li id='drawing-" + drawingCounter + "'>"
            +'<input type="checkbox" class="drawing-checkbox" checked="true"'
            + "<span class='editable'>"
            + name
            + " </span><a href='#'>x</a></li>"
        );

        window.drawingList['drawing-'+drawingCounter]=mapContents;

        drawingCounter++;
    };

    function deleteDrawingItem($this){
        var parentID = $this.parent().attr('id');

        for (content in window.drawingList[parentID]){
            window.drawingList[parentID][content].setMap(null);
        }
        delete window.drawingList[parentID];
        // Fade out the list item then remove from DOM
        $this.parent().fadeOut(function() {
            $this.parent().remove();
        });

        recomputeBounds();   
    };

    function toggleVisibility($this){
        var parentID = $this.parent().attr('id');
        var visible = $this.is(':checked');

        for (content in window.drawingList[parentID]){
            window.drawingList[parentID][content].setVisible(visible);
        }

        recomputeBounds();
    };

    function recomputeBounds(){
        var latLngBounds = new google.maps.LatLngBounds();
        for (drawing in window.drawingList){
            for (content in window.drawingList[drawing]){
                var object = window.drawingList[drawing][content];
                if (object.getVisible()){
                    if (object instanceof google.maps.Marker){
                        latLngBounds.extend(object.getPosition());
                    }
                    else if (object instanceof google.maps.Polyline || object instanceof google.maps.Polygon){
                        object.getPath().forEach(function(point){
                            latLngBounds.extend(point);
                        })
                    }
                }
            }
        }
        if (!latLngBounds.isEmpty()){
            window.map.fitBounds(latLngBounds);
        } else {
            window.map.setOptions(defaultMapOptions);
        }
    };
});


