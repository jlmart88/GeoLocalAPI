window.drawingList = {};
window.infoWindow = new google.maps.InfoWindow();

// TODO: clean up and compact the map drawing generating functions

// DOM Ready =============================================================
$(document).ready(function() {
    var drawingCounter = 0;
    var $drawingLists = $('.drawingList');
    var $objectList = $('#objectList');
    var $getObjectList = $('#getObjectList');
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
    $('#btnGetObjects').on('click', getObjects);

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
    $drawingLists.on('click', 'li .drawing', null, function(e){
        if ($(e.target).attr('class') != 'drawing-checkbox'){
            var $this = $(this).parent();
         
            focusObjectBounds(window.drawingList[$this.attr('id')]);
            toggleDrawingContents($this);
            if (window.drawingList[$this.attr('id')]){
                if (window.drawingList[$this.attr('id')].length == 1){
                    if (window.drawingList[$this.attr('id')][0]['drawing'].getVisible()){
                        google.maps.event.trigger(window.drawingList[$this.attr('id')][0]['drawing'],'click',{});
                    }
                }
            }
        }
    });

    $drawingLists.on('click', 'li .drawingContents li', null, function(e){
        var $this = $(this);

        focusObjectBounds([window.drawingList[$this.parent().parent().attr('id')][$this.attr('index')]]);
        google.maps.event.trigger(window.drawingList[$this.parent().parent().attr('id')][$this.attr('index')]['drawing'],'click');
    });


    // Functions =============================================================

    function objectPath(event) {
        event.preventDefault();

        var newObject = {
            'start': $('#objectPath fieldset input#inputStart').val(),
            'end': $('#objectPath fieldset input#inputEnd').val()
        };

        var clientID = $('#objectPath fieldset input#inputClientID').val();
        var customID = $('#objectPath fieldset input#inputCustomID').val();
        var clientSecret = $('#clientSecret fieldset input#inputClientSecret').val();

        // Use AJAX to post the object to our service
        $.ajax(createRequest('GET','/geo/'+clientID+'/positions/'+customID,newObject,clientSecret)).done(function( response ) {

            //Draw the path on the map as Markers and a Polyline
            if (response.error == 0){
                //Create a bounds to set our map view to after we are finished
                var latLngBounds = window.map.getBounds();
                var extended = false;
                var polylineArray = [];
                var markerArray = [];

                //Iterate through responses, creating markers and polyline points
                for (position in response.response){
                    var data = {data:response.response[position]};
                    var lat = response.response[position].location.coordinates[1];
                    var lng = response.response[position].location.coordinates[0];
                    var time = response.response[position].time;
                    data.name = new Date(response.response[position].time*1000).toLocaleString();

                    var timeString = (new Date(time*1000)).toLocaleString();

                    var latLng = new google.maps.LatLng(lat,lng);
                    //Extend our map view to include this new location
                    if (!(latLngBounds.contains(latLng))){
                        latLngBounds.extend(latLng);
                        extended = true;
                    }

                    var title = timeString;

                    var marker = createMarker(latLng, title, null, JSONToTable(data.data));

                    // To add the marker to the map, call setMap();
                    marker.setMap(window.map);

                    data.drawing = marker;
                    markerArray.push(data);
                    polylineArray.push(latLng);
                }
                //Create the polyline from the list of collected points

                var path = createPolyline(polylineArray);

                //To add the polyline to the map, call setMap();
                path.setMap(window.map);

                addDrawingItem($objectList,$('#objectPath fieldset input#inputCustomID').val(),markerArray.concat({drawing:path}));

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

    // Find nearby objects
    function getObjects(event) {
        event.preventDefault();

        var newObject = {
            'near':{
                'location': $('#getObjects fieldset input#inputLocation').val() ? JSON.parse($('#getObjects fieldset input#inputLocation').val()) : '',
                'distance': $('#getObjects fieldset input#inputDistance').val(),
                'offset' : $('#getObjects fieldset input#inputOffset').val()
            },
            'matching':{
                'categories': $('#getObjects fieldset input#inputCategories').val().split(","),
                'tags': $('#getObjects fieldset input#inputTags').val().split(","),
                'related': $('#getObjects fieldset input#inputRelated').val().split(",")
            }
        };
        var fields = ['tags','related','categories'];
        for (field in fields){
            if (/^\s*$/.test(newObject.matching[fields[field]])){
                delete newObject.matching[fields[field]];
            }
        }
        var fields = ['location','distance','offset'];
        for (field in fields){
            if (/^\s*$/.test(newObject.near[fields[field]])){
                delete newObject.near[fields[field]];
            }
        }
        var deleteKey = true;
        for (key in newObject){
            for (var property in newObject[key]) {
                if (hasOwnProperty.call(newObject[key], property)) deleteKey = false;
            }
            if (deleteKey){
                delete newObject[key];
            }
            deleteKey = true;
        }

        var clientID = $('#getObjects fieldset input#inputClientID').val();
        var customID = $('#getObjects fieldset input#inputCustomID').val();
        var clientSecret = $('#clientSecret fieldset input#inputClientSecret').val();
        
        // Use AJAX to post the object to our service
        $.ajax(createRequest('GET','/geo/'+clientID+'/objects/'+customID,newObject,clientSecret)).done(function( response ) {

            //Draw the path on the map as Markers and a Polyline
                if (response.error == 0){

                    //Create a bounds to set our map view to after we are finished
                    var latLngBounds = window.map.getBounds();
                    var extended = false;
                    var markerArray = [];

                    //Iterate through responses, creating markers and polyline points
                    for (object in response.response){
                        if (!response.response[object]['obj']){
                            alert("Fill out the 'Near' query for the objects to be mapped");
                            return;
                        }
                        var data = {data:response.response[object]['obj']};
                        var lat = response.response[object]['obj']['position'].location.coordinates[1];
                        var lng = response.response[object]['obj']['position'].location.coordinates[0];
                        var latLng = new google.maps.LatLng(lat,lng);
                        var time = response.response[object]['obj']['position'].time;
                        var timeString = (new Date(time*1000)).toLocaleString();
                        data.name = response.response[object]['obj'].customID;
                        
                        //Extend our map view to include this new location
                        if (!(latLngBounds.contains(latLng))){
                            latLngBounds.extend(latLng);
                            extended = true;
                        }

                        var title = "customID: " + response.response[object]['obj'].customID + " at " + timeString;
                        var icon = "http://www.google.com/intl/en_us/mapfiles/ms/micons/blue-dot.png";

                        var marker = createMarker(latLng, title, icon, JSONToTable(data.data));

                        // To add the marker to the map, call setMap();
                        marker.setMap(window.map);

                        data.drawing = marker;
                        markerArray.push(data);
                    }

                    //add the main object to the group in a different color
                    var data = {data:newObject};
                    var lat = newObject.near.location.coordinates[1];
                    var lng = newObject.near.location.coordinates[0];
                    var latLng = new google.maps.LatLng(lat,lng);

                    //Extend our map view to include this new location
                    if (!(latLngBounds.contains(latLng))){
                        latLngBounds.extend(latLng);
                        extended = true;
                    }

                    var customID = $('#getObjects fieldset input#inputCustomID').val()
                    var title = "customID: " + customID;
                    var icon = "http://www.google.com/intl/en_us/mapfiles/ms/micons/green-dot.png";

                    var marker = createMarker(latLng, title, icon);

                    // To add the marker to the map, call setMap();
                    marker.setMap(window.map);

                    data.drawing = marker;
                    markerArray.push(data);

                    addDrawingItem($getObjectList, customID ? customID : "["+lat+","+lng+"]",markerArray);

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

        var newObject = {
        };

        var clientID = $('#listGeofences fieldset input#inputClientID').val();
        var clientSecret = $('#clientSecret fieldset input#inputClientSecret').val();

        // Use AJAX to post the object to our service
        $.ajax(createRequest('GET','/geo/'+clientID+'/geofences',newObject,clientSecret)).done(function( response ) {

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

                        var data = {data:response.response[geofence]};
                        delete data.data.location;
                        var polygon = createPolygon(latLngArray,JSONToTable(data.data));

                        // To add the marker to the map, call setMap();
                        polygon.setMap(window.map);

                        data.drawing = polygon;

                        addDrawingItem($geofenceList,response.response[geofence].geofenceID,[data]);
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
    };

    function addDrawingItem($list,name,mapContents){
        $list.append(
            "<li id='drawing-" + drawingCounter + "'>"
            +'<div class="drawing">'
            +'<input type="checkbox" class="drawing-checkbox" checked="true"/>'
            + "<span>"
            + name
            + "</span><a href='#'>x</a></div>"
            +"<ul id='drawing-contents-"+drawingCounter+"' class = 'drawingContents' filled='false'/>"
            +"</li>"
        );
        $("#drawing-" + drawingCounter).hide(0,function(){
            $("#drawing-" + drawingCounter).fadeIn();
        })
        

        window.drawingList['drawing-'+drawingCounter]=mapContents;

        drawingCounter++;
    };

    function deleteDrawingItem($this){
        var parentID = $this.parent().parent().attr('id');

        for (content in window.drawingList[parentID]){
            window.drawingList[parentID][content]['drawing'].setMap(null);

        }
        window.infoWindow.close();
        delete window.drawingList[parentID];
        // Fade out the list item then remove from DOM
        $this.parent().parent().remove();

        recomputeAllBounds();   
    };

    function toggleVisibility($this){
        var parentID = $this.parent().parent().attr('id');
        var visible = $this.is(':checked');

        for (content in window.drawingList[parentID]){
            window.drawingList[parentID][content]['drawing'].setVisible(visible);
        }

        recomputeAllBounds();
    };

    function recomputeAllBounds(){
        var latLngBounds = new google.maps.LatLngBounds();
        for (drawing in window.drawingList){
            for (content in window.drawingList[drawing]){
                var object = window.drawingList[drawing][content]['drawing'];
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

    function focusObjectBounds($objectList){
        var latLngBounds = new google.maps.LatLngBounds();
        for (content in $objectList){
            var object = $objectList[content]['drawing'];
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

    function toggleDrawingContents($this){
        $list = $this.find('ul');
        var id = $this.attr('id');

        
        var counter = 0;
        for (content in window.drawingList[id]){
            if (window.drawingList[id][content]['name']){
                if ($list.attr('filled')=='false'){
                    $list.append(
                        "<li id='"+id+'-'+counter+"' index="+counter+">"
                        + "<span>"
                        + window.drawingList[id][content]['name']
                        + "</span>"
                        +"</li>"
                    );
                }
                else {
                    $list.find('#'+id+'-'+counter).remove();
                }
                counter++;
            }
        }
        $list.attr('filled', $list.attr('filled')=='false' ? 'true' : 'false');
    }

    function createMarker(latLng, title, icon, infoWindowString){
        var parameters = {
            animation: google.maps.Animation.DROP,
            position: latLng,
            title: title,
            testField: 'hi'
        };
        if (icon!=null){
            parameters.icon = icon;
        }

        var marker = new google.maps.Marker(parameters);
        google.maps.event.addListener(marker, 'click', function() {
            window.infoWindow.close();
            window.infoWindow.setContent(infoWindowString);
            window.infoWindow.open(window.map,marker);
        });

        return marker;
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

    function createPolygon(latLngArray,infoWindowString){
        var parameters = {  
            paths: latLngArray,
            strokeColor: '#FF9933',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: '#FF9933',
            fillOpacity: 0.25
        };
        var polygon = new google.maps.Polygon(parameters);
        google.maps.event.addListener(polygon, 'click', function() {
            
            window.infoWindow.close();
            window.infoWindow.setContent(infoWindowString);
            window.infoWindow.setPosition(new google.maps.LatLngBounds(latLngArray[0],latLngArray[2]).getCenter());
            window.infoWindow.open(window.map);
        });
        google.maps.event.addListener(polygon, 'visible_changed', function(){
            if (window.infoWindow.getContent() == infoWindowString){
                window.infoWindow.close();
            }
        })
        return polygon;
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

    function JSONToTable(data,name){
        var string = '';
        if (!name){
            string = '<div><table class="drawingDataTable">';
        }
        $.each(data, function(key, value){
            if (name){
                key = name+'.'+key;
            }
            if (typeof value != "object" || value instanceof Array){
                string += '<tr><td>'+key+'</td><td>'+JSON.stringify(value)+'</td></tr>';
            }
            else {
                string += JSONToTable(value, key);
            }
        })
        if (!name){
            string += '</table></div>';
        }
        return string;

    }

})


