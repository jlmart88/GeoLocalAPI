window.drawingList = {};

// TODO: clean up and compact the map drawing generating functions

// DOM Ready =============================================================
$(document).ready(function() {
    var drawingCounter = 0;
    var $drawingLists = $('.drawingList');
    var $objectList = $('#objectList');
    var $nearbyObjectList = $('#nearbyObjectList');
    var $geofenceList = $('#geofenceList');
    var defaultMapOptions ={
            center: new google.maps.LatLng(41.387, 2.168),
            zoom: 12
        };


    function initialize() {
        window.map = new google.maps.Map(document.getElementById("map-canvas"),
            defaultMapOptions);

        //make the map stick to the top when scrolling down
        $(function() {
        var move = function() {
            var st = $(window).scrollTop();
            var ot = $("#map-canvas-anchor").offset().top;
            var s = $("#map-canvas-container");
            if(st > ot) {
                s.css({
                    position: "fixed",
                    top: "0px"
                });
            } else {
                if(st <= ot) {
                    s.css({
                        position: "relative",
                        top: ""
                    });
                }
            }
        };
        $(window).scroll(move);
        move();
    });
    }

    google.maps.event.addDomListener(window, 'load', initialize);

    // Object Path button click
    $('#btnObjectPath').on('click', objectPath);

    // List Geofences button click
    $('#btnListGeofences').on('click', listGeofences);

    // Nearby Objects button click
    $('#btnNearbyObjects').on('click', nearbyObjects);

    //Fade in/out the red X to delete the object
    $drawingLists.delegate('li', 'mouseover mouseout', function(event) {
        var $this = $(this).find('a');
         
        if(event.type === 'mouseover') {
            $this.stop(true, true).fadeIn();
        } else {
            $this.stop(true, true).fadeOut();
        }
    });

    //Delete the object upon clicking the X
    $drawingLists.delegate("a", "click", function(e) {
        e.preventDefault();
        var $this = $(this);
     
        deleteDrawingItem($this);
    });

    //Change the visibilty of an object when the checkbox is toggled
    $drawingLists.delegate('input', 'change', function(e){
        e.preventDefault();
        var $this = $(this);
     
        toggleVisibility($this);
    });

    //Zoom the map on an object when it is clicked on, if it is visible
    $drawingLists.delegate('li', 'click', function(e){
        var $this = $(this);
     
        focusObjectBounds($this);
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
            var clientSecret = $('#clientSecret fieldset input#inputClientSecret').val();
            // Use AJAX to post the object to our service
            $.ajax(createRequest('GET','/geo/objectPath',newObject,clientSecret)).done(function( response ) {

                    //Draw the path on the map as Markers and a Polyline
                    if (response.error == 0){
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

                            var latLng = new google.maps.LatLng(lat,lng);
                            //Extend our map view to include this new location
                            if (!(latLngBounds.contains(latLng))){
                                latLngBounds.extend(latLng);
                                extended = true;
                            }

                            var title = timeString;

                            var marker = createMarker(latLng, title);

                            // To add the marker to the map, call setMap();
                            marker.setMap(window.map);

                            markerArray.push(marker);
                            polylineArray.push(latLng);
                        }
                        //Create the polyline from the list of collected points

                        var path = createPolyline(polylineArray);

                        //To add the polyline to the map, call setMap();
                        path.setMap(window.map);

                        addDrawingItem($objectList,$('#objectPath fieldset input#inputCustomID').val(),markerArray.concat(path));

                        //Set the bounds of the map view depending on whether we have a path or a single point
                        if (response.response.length>0){
                            if ((response.response.length>1 && extended) || extended){
                                window.map.fitBounds(latLngBounds);
                            } else if (response.response.length==1){
                                window.map.setCenter(latLng);
                            }
                        }
                    }
                    else {
                        alert(JSON.stringify(response));
                    }
            });
        }
        else {
            // If errorCount is more than 0, error out
            alert('Please fill in all fields');
            return false;
        }
    };

    // Find nearby objects
    function nearbyObjects(event) {
        event.preventDefault();

        var newObject = {
            'clientID': $('#nearbyObjects fieldset input#inputClientID').val(),
            'customID': $('#nearbyObjects fieldset input#inputCustomID').val(),
            'location': JSON.parse($('#nearbyObjects fieldset input#inputLocation').val()),
            'distance': $('#nearbyObjects fieldset input#inputDistance').val(),
            'offset' : $('#nearbyObjects fieldset input#inputOffset').val(),
            'fields' : $('#nearbyObjects fieldset input#inputFields').val().split(",")
        };

        if (/^\s*$/.test(newObject['fields'])){
            delete newObject['fields'];
        }

        var clientSecret = $('#clientSecret fieldset input#inputClientSecret').val();
        // Use AJAX to post the object to our service
        $.ajax(createRequest('GET','/geo/nearbyObjects',newObject,clientSecret)).done(function( response ) {

            //Draw the path on the map as Markers and a Polyline
                if (response.error == 0){
                    //Create a bounds to set our map view to after we are finished
                    var latLngBounds = window.map.getBounds();
                    var extended = false;
                    var markerArray = [];

                    //Iterate through responses, creating markers and polyline points
                    for (object in response.response){
                        var lat = response.response[object]['obj']['position'].location.coordinates[1];
                        var lng = response.response[object]['obj']['position'].location.coordinates[0];
                        var latLng = new google.maps.LatLng(lat,lng);
                        var time = response.response[object]['obj']['position'].time;
                        var timeString = (new Date(time*1000)).toLocaleString();
                        
                        //Extend our map view to include this new location
                        if (!(latLngBounds.contains(latLng))){
                            latLngBounds.extend(latLng);
                            extended = true;
                        }

                        var title = "customID: " + response.response[object]['obj'].customID + " at " + timeString;
                        var icon = "http://www.google.com/intl/en_us/mapfiles/ms/micons/blue-dot.png";

                        var marker = createMarker(latLng, title, icon);

                        // To add the marker to the map, call setMap();
                        marker.setMap(window.map);

                        markerArray.push(marker);
                    }

                    //add the main object to the group in a different color
                    var lat = newObject.location.coordinates[1];
                    var lng = newObject.location.coordinates[0];
                    var latLng = new google.maps.LatLng(lat,lng);

                    //Extend our map view to include this new location
                    if (!(latLngBounds.contains(latLng))){
                        latLngBounds.extend(latLng);
                        extended = true;
                    }

                    var title = "customID: " + $('#nearbyObjects fieldset input#inputCustomID').val();
                    var icon = "http://www.google.com/intl/en_us/mapfiles/ms/micons/green-dot.png";

                    var marker = createMarker(latLng, title, icon);

                    // To add the marker to the map, call setMap();
                    marker.setMap(window.map);

                    markerArray.push(marker);

                    addDrawingItem($nearbyObjectList,$('#nearbyObjects fieldset input#inputCustomID').val(),markerArray);

                    //Set the bounds of the map view depending on whether we have a path or a single point
                    if (response.response.length>0){
                        if ((response.response.length>1 && extended) || extended){
                            window.map.fitBounds(latLngBounds);
                        } else if (response.response.length==1){
                            window.map.setCenter(latLng);
                        }
                    }
                }
                else {
                    alert(JSON.stringify(response));
                }
        });
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

            var clientSecret = $('#clientSecret fieldset input#inputClientSecret').val();
            // Use AJAX to post the object to our service
            $.ajax(createRequest('GET','/geo/geofence',newObject)).done(function( response ) {

                //Draw the geofences on the map as Polygons

                if (response.error==0){
                    //Create a bounds to set our map view to after we are finished
                    var latLngBounds = window.map.getBounds();
                    var extended = false;

                    //Iterate through responses, creating markers and polyline points
                    for (geofence in response.response){
                        var latLngArray = [];
                        var coordinates = response.response[geofence].location.coordinates[0];
                        for (coordinate in coordinates){
                            var latLng = new google.maps.LatLng(coordinates[coordinate][1],coordinates[coordinate][0]);
                            //Extend our map view to include this new location
                            if (!(latLngBounds.contains(latLng))){
                                latLngBounds.extend(latLng);
                                extended = true;
                            }
                            
                            latLngArray.push(latLng);
                        }

                        var polygon = createPolygon(latLngArray);

                        // To add the marker to the map, call setMap();
                        polygon.setMap(window.map);

                        addDrawingItem($geofenceList,response.response[geofence].geofenceID,[polygon]);
                    }

                    //Set the bounds of the map view
                    if (extended){
                        window.map.fitBounds(latLngBounds);
                    }
                }
                else {
                    alert(JSON.stringify(response));
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
        $("#drawing-" + drawingCounter).hide(0,function(){
            $("#drawing-" + drawingCounter).fadeIn();
        })
        

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
        $this.parent().remove();

        recomputeAllBounds();   
    };

    function toggleVisibility($this){
        var parentID = $this.parent().attr('id');
        var visible = $this.is(':checked');

        for (content in window.drawingList[parentID]){
            window.drawingList[parentID][content].setVisible(visible);
        }

        recomputeAllBounds();
    };

    function recomputeAllBounds(){
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

    function focusObjectBounds($this){
        var id = $this.attr('id');

        var latLngBounds = new google.maps.LatLngBounds();
        for (content in window.drawingList[id]){
            var object = window.drawingList[id][content];
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
        if (!latLngBounds.isEmpty()){
            window.map.fitBounds(latLngBounds);
        } 
    };

    function createMarker(latLng, title, icon){
        var parameters = {
            animation: google.maps.Animation.DROP,
            position: latLng,
            title: title
        };
        if (icon!=null){
            parameters.icon = icon;
        }
        return  new google.maps.Marker(parameters);
    }

    function createPolyline(path){
        var lineSymbol = {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW
        };
        var parameters = {
            path: path,
            icons: [{
                icon: lineSymbol,
                offset: '100%',
                repeat: '50%'
            }],
            geodesic: true,
            strokeColor: '#FF0000',
            strokeOpacity: 1.0,
            strokeWeight: 2
        };
        return new google.maps.Polyline(parameters);
    }

    function createPolygon(latLngArray){
        var parameters = {  
            paths: latLngArray,
            strokeColor: '#FF9933',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: '#FF9933',
            fillOpacity: 0.25
        };
        return new google.maps.Polygon(parameters);
    }

    function createRequest(typeString, urlString, newObject, clientSecret){
        var dataString = JSON.stringify(newObject);
        var timeString = (new Date).getTime()/1000;
        var signature = CryptoJS.SHA1(dataString+timeString+clientSecret);

        var request = {
            type: typeString,
            data: typeString == 'GET' ? newObject : dataString,
            url: urlString,
            contentType : 'application/json',
            dataType: 'JSON',
            headers:{
                'X-Signature':signature,
                'X-Authentication-Type':'SHA1',
                'X-Timestamp':timeString
            }
        };
        return request;
    }

})


