// JS for GeoLocalization API interface
// TechIdeas
// Justin Martinez

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
    $('#btnGetObjects').on('click', getObjects);

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
        'categories': $('#addObject fieldset input#inputCategories').val().split(","),
        'tags': $('#addObject fieldset input#inputTags').val().split(","),
        'related': $('#addObject fieldset input#inputRelated').val().split(","),
    }

    var clientID = $('#addObject fieldset input#inputClientID').val();
    var customID = $('#addObject fieldset input#inputCustomID').val();

    // Use AJAX to post the object to our service
    $.ajax(createRequest('POST','/geo/'+clientID+'/objects/'+customID,newObject)).done(function( response ) {
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
        'categories': $('#addFields fieldset input#inputCategories').val().split(","),
        'tags': $('#addFields fieldset input#inputTags').val().split(","),
        'related': $('#addFields fieldset input#inputRelated').val().split(","),
    }

    var clientID = $('#addFields fieldset input#inputClientID').val();
    var customIDs = $('#addFields fieldset input#inputCustomIDs').val();

    // Use AJAX to post the object to our service
    $.ajax(createRequest('PUT','/geo/'+clientID+'/objects/'+customIDs,newObject)).done(function( response ) {
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
        'categories': $('#deleteFields fieldset input#inputCategories').val().split(","),
        'tags': $('#deleteFields fieldset input#inputTags').val().split(","),
        'related': $('#deleteFields fieldset input#inputRelated').val().split(",")
    }

    var clientID = $('#deleteFields fieldset input#inputClientID').val();
    var customIDs = $('#deleteFields fieldset input#inputCustomIDs').val();

    var fields = ['tags','related','categories'];
    for (field in fields){
        if (/^\s*$/.test(newObject[fields[field]])){
            delete newObject[fields[field]];
        }
    }

    // Use AJAX to post the object to our service
    $.ajax(createRequest('DELETE','/geo/'+clientID+'/objects/'+customIDs,newObject)).done(function( response ) {
        console.log(response);
        // Fill the response field on the webpage
        $('#deleteFieldsResponse').text(JSON.stringify(response));
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
    
    // Use AJAX to post the object to our service
    $.ajax(createRequest('GET','/geo/'+clientID+'/objects/'+customID,newObject)).done(function( response ) {
        console.log(response);
        // Fill the response field on the webpage
        $('#getObjectsResponse').text(JSON.stringify(response));
    });
};

// Add position
function savePosition(event) {
    event.preventDefault();

    // Create position json
    var positionJSON = JSON.parse($('#savePosition fieldset input#inputPosition').val());

    // If it is, compile all user info into one object
    var newObject = {
        'position': positionJSON};

    var clientID = $('#savePosition fieldset input#inputClientID').val();
    var customID = $('#savePosition fieldset input#inputCustomID').val();

    // Use AJAX to post the object to our service
    $.ajax(createRequest('POST','/geo/'+clientID+'/positions/'+customID,newObject)).done(function( response ) {
        console.log(response);
        // Fill the response field on the webpage
        $('#savePositionResponse').text(JSON.stringify(response));
    });
};

// Find last position
function lastPosition(event) {
    event.preventDefault();

    var newObject = { 
        'last':"true" 
    };

    var clientID = $('#lastPosition fieldset input#inputClientID').val();
    var customID = $('#lastPosition fieldset input#inputCustomID').val();

    // Use AJAX to post the object to our service
    $.ajax(createRequest('GET','/geo/'+clientID+'/positions/'+customID,newObject)).done(function( response ) {
        console.log(response);
        // Fill the response field on the webpage
        $('#lastPositionResponse').text(JSON.stringify(response));
    });
};

// List the positions of an object
function objectPath(event) {
    event.preventDefault();

    var newObject = {
        'start': $('#objectPath fieldset input#inputStart').val(),
        'end': $('#objectPath fieldset input#inputEnd').val()
    };

    var clientID = $('#objectPath fieldset input#inputClientID').val();
    var customID = $('#objectPath fieldset input#inputCustomID').val();

    // Use AJAX to post the object to our service
    $.ajax(createRequest('GET','/geo/'+clientID+'/positions/'+customID,newObject)).done(function( response ) {
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
        'lng': $('#addGeofence fieldset input#inputLng').val().split(","),
        'lat': $('#addGeofence fieldset input#inputLat').val().split(","),
        'distance': $('#addGeofence fieldset input#inputDistance').val().split(","),
    }

    var clientID = $('#addGeofence fieldset input#inputClientID').val();
    var geofenceID = $('#addGeofence fieldset input#inputGeofenceID').val();

    // Use AJAX to post the object to our service
    $.ajax(createRequest('POST','/geo/'+clientID+'/geofences/'+geofenceID,newObject)).done(function( response ) {
        console.log(response);
        // Fill the response field on the webpage
        $('#addGeofenceResponse').text(JSON.stringify(response));
    });   
};

// List geofences
function listGeofences(event) {
    event.preventDefault();

    var newObject = {
    };

    var clientID = $('#listGeofences fieldset input#inputClientID').val();

    // Use AJAX to post the object to our service
    $.ajax(createRequest('GET','/geo/'+clientID+'/geofences',newObject)).done(function( response ) {
        console.log(response);
        // Fill the response field on the webpage
        $('#listGeofencesResponse').text(JSON.stringify(response));
    });
};

// Delete geofence
function deleteGeofence(event) {
    event.preventDefault();

    var newObject = {
    };

    var clientID = $('#deleteGeofence fieldset input#inputClientID').val();
    var geofenceID = $('#deleteGeofence fieldset input#inputGeofenceID').val();

    // Use AJAX to post the object to our service
    $.ajax(createRequest('DELETE','/geo/'+clientID+'/geofences/'+geofenceID,newObject)).done(function( response ) {
        console.log(response);
        // Fill the response field on the webpage
        $('#deleteGeofenceResponse').text(JSON.stringify(response));
    });
};

function createRequest(typeString, urlString, newObject){
    var dataString = JSON.stringify(newObject);
    var timeString = (new Date).getTime()/1000;
    var signature = CryptoJS.SHA1(dataString+timeString+clientSecret);
    console.log(dataString+timeString+clientSecret);

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