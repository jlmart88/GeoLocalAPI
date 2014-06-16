var clientSecret = "nomelase";

// DOM Ready =============================================================
$(document).ready(function() {

    // Add Object button click
    $('#btnAddObject').on('click', addObject);

    // Save Position button click
    $('#btnSavePosition').on('click', savePosition);

    // Last Position button click
    $('#btnLastPosition').on('click', lastPosition);

    // Nearby Objects button click
    $('#btnNearbyObjects').on('click', nearbyObjects);

    // Object Path button click
    $('#btnObjectPath').on('click', objectPath);

});

// Functions =============================================================

// Add object
function addObject(event) {
    event.preventDefault();

    // Super basic validation - increase errorCount variable if any fields are blank
    var errorCount = 0;
    $('#addObject input').each(function(index, val) {
        if($(this).val() === '') { errorCount++; }
    });

    // Check and make sure errorCount's still at zero
    if(errorCount === 0) {

        // If it is, compile all user info into one object
        var newObject = {
            'clientID': $('#addObject fieldset input#inputClientID').val(),
            'customID': $('#addObject fieldset input#inputCustomID').val(),
            'categories': $('#addObject fieldset input#inputCategories').val().split(","),
            'tags': $('#addObject fieldset input#inputTags').val().split(","),
            'related': $('#addObject fieldset input#inputRelated').val().split(","),
        }

        //create a hash
        var dataString = JSON.stringify(newObject);
        var timeString = (new Date).getTime()/1000;
        var signature = CryptoJS.SHA1(dataString+timeString+clientSecret);


        // Use AJAX to post the object to our service
        $.ajax({
            type: 'POST',
            data: dataString,
            url: '/geo/addobject',
            contentType: 'application/json',
            dataType: 'JSON',
            headers:{
                'X-Signature':signature,
                'X-Authentication-Type':'SHA1',
                'X-Timestamp':timeString
            }
        }).done(function( response ) {

            // Check for successful (blank) response
            if (response.msg === '') {

                // Clear the form inputs
                $('#addObject fieldset input').val('');

            }
            else {

                // If something goes wrong, alert the error message that our service returned
                alert('Error: ' + response.msg);

            }
        });
    }
    else {
        // If errorCount is more than 0, error out
        alert('Please fill in all fields');
        return false;
    }
};

// Add position
function savePosition(event) {
    event.preventDefault();

    // Super basic validation - increase errorCount variable if any fields are blank
    var errorCount = 0;
    $('#savePosition input').each(function(index, val) {
        if($(this).val() === '') { errorCount++; }
    });

    // Check and make sure errorCount's still at zero
    if(errorCount === 0) {

        // Create position json
        var positionJSON = JSON.parse($('#savePosition fieldset input#inputPosition').val());

        // If it is, compile all user info into one object
        var newObject = {
            'clientID': $('#savePosition fieldset input#inputClientID').val(),
            'customID': $('#savePosition fieldset input#inputCustomID').val(),
            'position': positionJSON};

        //stringify the object, then send as 'application/json' to prevent ajax from converting numbers to strings
        //create a hash
        var dataString = JSON.stringify(newObject);
        var timeString = (new Date).getTime()/1000;
        var signature = CryptoJS.SHA1(dataString+timeString+clientSecret);

        // Use AJAX to post the object to our service
        $.ajax({
            type: 'POST',
            data: dataString,
            contentType: 'application/json',
            url: '/geo/saveposition',
            dataType: 'JSON',
            headers:{
                'X-Signature':signature,
                'X-Authentication-Type':'SHA1',
                'X-Timestamp':timeString
            }
        }).done(function( response ) {

            // Check for successful (blank) response
            if (response.msg === '') {

                // Clear the form inputs
                $('#savePosition fieldset input').val('');

            }
            else {

                // If something goes wrong, alert the error message that our service returned
                alert('Error: ' + response.msg);

            }
        });
    }
    else {
        // If errorCount is more than 0, error out
        alert('Please fill in all fields');
        return false;
    }
};

// Find last position
function lastPosition(event) {
    event.preventDefault();

    // Super basic validation - increase errorCount variable if any fields are blank
    var errorCount = 0;
    $('#lastPosition input').each(function(index, val) {
        if($(this).val() === '') { errorCount++; }
    });

    // Check and make sure errorCount's still at zero
    if(errorCount === 0) {

        var newObject = {
            'clientID': $('#lastPosition fieldset input#inputClientID').val(),
            'customID': $('#lastPosition fieldset input#inputCustomID').val()
        };

        var dataString = JSON.stringify(newObject);
        var timeString = (new Date).getTime()/1000;
        var signature = CryptoJS.SHA1(dataString+timeString+clientSecret);

        // Use AJAX to post the object to our service
        $.ajax({
            type: 'GET',
            data: newObject,
            url: '/geo/lastposition',
            dataType: 'JSON',
            headers:{
                'X-Signature':signature,
                'X-Authentication-Type':'SHA1',
                'X-Timestamp':timeString
            }
        }).done(function( response ) {

                console.log(response);
                // Fill the response field on the webpage
                $('#lastPositionResponse').text(JSON.stringify(response));

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

    // Super basic validation - increase errorCount variable if any fields are blank
    var errorCount = 0;
    $('#nearbyObjects input').each(function(index, val) {
        
        if($(this).val() === '') { 
            // Allow offset to be empty
            if($(this).context.id != 'inputOffset') {
                errorCount++;
            } 
        }
    });

    // Check and make sure errorCount's still at zero
    if(errorCount === 0) {

        var newObject = {
            'clientID': $('#nearbyObjects fieldset input#inputClientID').val(),
            'customID': $('#nearbyObjects fieldset input#inputCustomID').val(),
            'location': JSON.parse($('#nearbyObjects fieldset input#inputLocation').val()),
            'distance': $('#nearbyObjects fieldset input#inputDistance').val(),
            'offset' : $('#nearbyObjects fieldset input#inputOffset').val()
        };

        var dataString = JSON.stringify(newObject);
        var timeString = (new Date).getTime()/1000;
        var signature = CryptoJS.SHA1(dataString+timeString+clientSecret);


        // Use AJAX to post the object to our service
        $.ajax({
            type: 'GET',
            data: newObject,
            url: '/geo/nearbyobjects',
            dataType: 'JSON',
            headers:{
                'X-Signature':signature,
                'X-Authentication-Type':'SHA1',
                'X-Timestamp':timeString
            }
        }).done(function( response ) {

                console.log(response);
                // Fill the response field on the webpage
                $('#nearbyObjectsResponse').text(JSON.stringify(response));

        });
    }
    else {
        // If errorCount is more than 0, error out
        alert('Please fill in all fields');
        return false;
    }
};

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
            headers:{
                'X-Signature':signature,
                'X-Authentication-Type':'SHA1',
                'X-Timestamp':timeString
            }
        }).done(function( response ) {

                console.log(response);
                // Fill the response field on the webpage
                $('#objectPathResponse').text(JSON.stringify(response));

        });
    }
    else {
        // If errorCount is more than 0, error out
        alert('Please fill in all fields');
        return false;
    }
}
