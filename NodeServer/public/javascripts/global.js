var clientSecret = "nomelase";

// DOM Ready =============================================================
$(document).ready(function() {

    // Add Object button click
    $('#btnAddObject').on('click', addObject);

    // Add Fields button click
    $('#btnAddFields').on('click', addFields);

    // Delete Fields button click
    $('#btnDeleteFields').on('click', deleteFields);

    // Save Position button click
    $('#btnSavePosition').on('click', savePosition);

    // Last Position button click
    $('#btnLastPosition').on('click', lastPosition);

    // Nearby Objects button click
    $('#btnNearbyObjects').on('click', nearbyObjects);

    // Object Path button click
    $('#btnObjectPath').on('click', objectPath);

    // Add Geofence button click
    $('#btnAddGeofence').on('click', addGeofence);

    // List Geofences button click
    $('#btnListGeofences').on('click', listGeofences);

    // Delete Geofence button click
    $('#btnDeleteGeofence').on('click', deleteGeofence);

});

// Functions =============================================================

// Add object
function addObject(event) {
    event.preventDefault();

    // If it is, compile all user info into one object
    var newObject = {
        'clientID': $('#addObject fieldset input#inputClientID').val(),
        'customID': $('#addObject fieldset input#inputCustomID').val(),
        'categories': $('#addObject fieldset input#inputCategories').val().split(","),
        'tags': $('#addObject fieldset input#inputTags').val().split(","),
        'related': $('#addObject fieldset input#inputRelated').val().split(","),
    }

    // Use AJAX to post the object to our service
    $.ajax(createRequest('POST','/geo/addobject',newObject)).done(function( response ) {
        console.log(response);
        // Fill the response field on the webpage
        $('#addObjectResponse').text(JSON.stringify(response));
    });
};
 
 // Add object
function addFields(event) {
    event.preventDefault();

    // If it is, compile all user info into one object
    var newObject = {
        'clientID': $('#addFields fieldset input#inputClientID').val(),
        'customIDs': $('#addFields fieldset input#inputCustomIDs').val().split(","),
        'categories': $('#addFields fieldset input#inputCategories').val().split(","),
        'tags': $('#addFields fieldset input#inputTags').val().split(","),
        'related': $('#addFields fieldset input#inputRelated').val().split(","),
    }

    // Use AJAX to post the object to our service
    $.ajax(createRequest('POST','/geo/addfields',newObject)).done(function( response ) {
        console.log(response);
        // Fill the response field on the webpage
        $('#addFieldsResponse').text(JSON.stringify(response));
    });
};

 // Delete object
function deleteFields(event) {
    event.preventDefault();

    // If it is, compile all user info into one object
    var newObject = {
        'clientID': $('#deleteFields fieldset input#inputClientID').val(),
        'customIDs': $('#deleteFields fieldset input#inputCustomIDs').val().split(","),
        'categories': $('#deleteFields fieldset input#inputCategories').val().split(","),
        'tags': $('#deleteFields fieldset input#inputTags').val().split(","),
        'related': $('#deleteFields fieldset input#inputRelated').val().split(",")
    }

    // Use AJAX to post the object to our service
    $.ajax(createRequest('DELETE','/geo/deleteFields',newObject)).done(function( response ) {
        console.log(response);
        // Fill the response field on the webpage
        $('#deleteFieldsResponse').text(JSON.stringify(response));
    });
};    

// Add position
function savePosition(event) {
    event.preventDefault();

    // Create position json
    var positionJSON = JSON.parse($('#savePosition fieldset input#inputPosition').val());

    // If it is, compile all user info into one object
    var newObject = {
        'clientID': $('#savePosition fieldset input#inputClientID').val(),
        'customID': $('#savePosition fieldset input#inputCustomID').val(),
        'position': positionJSON};

    // Use AJAX to post the object to our service
    $.ajax(createRequest('POST','/geo/saveposition',newObject)).done(function( response ) {
        console.log(response);
        // Fill the response field on the webpage
        $('#savePositionResponse').text(JSON.stringify(response));
    });
};

// Find last position
function lastPosition(event) {
    event.preventDefault();

    var newObject = {
        'clientID': $('#lastPosition fieldset input#inputClientID').val(),
        'customID': $('#lastPosition fieldset input#inputCustomID').val()
    };

    // Use AJAX to post the object to our service
    $.ajax(createRequest('GET','/geo/lastposition',newObject)).done(function( response ) {
        console.log(response);
        // Fill the response field on the webpage
        $('#lastPositionResponse').text(JSON.stringify(response));
    });
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
        'categories': $('#nearbyObjects fieldset input#inputCategories').val().split(","),
        'tags': $('#nearbyObjects fieldset input#inputTags').val().split(","),
        'related': $('#nearbyObjects fieldset input#inputRelated').val().split(",")
    };
    var fields = ['tags','related','categories'];
    console.log(newObject);
    for (field in fields){
        if (/^\s*$/.test(newObject[fields[field]])){
            delete newObject[fields[field]];
        }
    }
    
    // Use AJAX to post the object to our service
    $.ajax(createRequest('GET','/geo/nearbyobjects',newObject)).done(function( response ) {
        console.log(response);
        // Fill the response field on the webpage
        $('#nearbyObjectsResponse').text(JSON.stringify(response));
    });
};

// List the positions of an object
function objectPath(event) {
    event.preventDefault();

    var newObject = {
        'clientID': $('#objectPath fieldset input#inputClientID').val(),
        'customID': $('#objectPath fieldset input#inputCustomID').val(),
        'start': $('#objectPath fieldset input#inputStart').val(),
        'end': $('#objectPath fieldset input#inputEnd').val()
    };

    // Use AJAX to post the object to our service
    $.ajax(createRequest('GET','/geo/objectPath',newObject)).done(function( response ) {
        console.log(response);
        // Fill the response field on the webpage
        $('#objectPathResponse').text(JSON.stringify(response));
    });
};

// Add geofence
function addGeofence(event) {
    event.preventDefault();

    // If it is, compile all user info into one object
    var newObject = {
        'clientID': $('#addGeofence fieldset input#inputClientID').val(),
        'geofenceID': $('#addGeofence fieldset input#inputGeofenceID').val(),
        'lng': $('#addGeofence fieldset input#inputLng').val().split(","),
        'lat': $('#addGeofence fieldset input#inputLat').val().split(","),
        'distance': $('#addGeofence fieldset input#inputDistance').val().split(","),
    }

    // Use AJAX to post the object to our service
    $.ajax(createRequest('POST','/geo/geofence',newObject)).done(function( response ) {
        console.log(response);
        // Fill the response field on the webpage
        $('#addGeofenceResponse').text(JSON.stringify(response));
    });
    
};

// List geofences
function listGeofences(event) {
    event.preventDefault();

    var newObject = {
        'clientID': $('#listGeofences fieldset input#inputClientID').val()
    };

    // Use AJAX to post the object to our service
    $.ajax(createRequest('GET','/geo/geofence',newObject)).done(function( response ) {
        console.log(response);
        // Fill the response field on the webpage
        $('#listGeofencesResponse').text(JSON.stringify(response));
    });
};

// Delete geofence
function deleteGeofence(event) {
    event.preventDefault();

    var newObject = {
        'clientID': $('#deleteGeofence fieldset input#inputClientID').val(),
        'geofenceID': $('#deleteGeofence fieldset input#inputGeofenceID').val()
    };

    // Use AJAX to post the object to our service
    $.ajax(createRequest('DELETE','/geo/geofence',newObject)).done(function( response ) {
        console.log(response);
        // Fill the response field on the webpage
        $('#deleteGeofenceResponse').text(JSON.stringify(response));
    });
};

function createRequest(typeString, urlString, newObject){
    var dataString = JSON.stringify(newObject);
    var timeString = (new Date).getTime()/1000;
    var signature = CryptoJS.SHA1(dataString+timeString+clientSecret);

    var request = {
        type: typeString,
        data: typeString == 'GET' ? newObject : dataString,
        url: typeString == 'DELETE' ? urlString+'?'+$.param(newObject) : urlString,
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