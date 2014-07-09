GEOLOCALIZATION API
===================

The goal of this service is to provide geolocalizations capabilities as:

-   register the position of people or mobile objects over the time
-   query the last postion of an object
-   track an object
-   find nearby objects depending on distance
-   allow relations between objects
-   etc.

Model
-----

There are three objects stored in the database: Objects, Positions, and Geofences

### Object

The representation of a mobile object. The information required for the system is customID, which should be unique to each object. Other fields can be used by the API client for linking the API object with his system.

-   \_id (generated and only used by MongoDB)
-   clientId: String (unique ID for the app)
-   customId: String (links each Object to its Positions)
    Optional Fields
-   *categories*: [String]
-   *tags*: [String]
-   *related*: [customID]

### Position

The representation of a position at a given time

-   \_id (generated and only used by MongoDB)
-   clientID: String (unique ID for the app)
-   customId: String (links each Object to its Positions)
-   position: {
    -   location: GeoJSON object ({type:“Point”, coordinates:[lng,lat]})
    -   time: date
        Optional Fields
    -   *accuracy*: double
    -   *speed*: double
    -   *altitude*: double
    -   *bearing*: double
         }

### Geofence

The representation of a geofence

-   \_id (generated and only used by MongoDB)
- clientID: String (unique ID for the app)
- geofenceId: String (links each Object to its Positions)
- location: GeoJSON object
- center: GeoJSON object

### JSON Objects

|JSON Position||
|-------------|---|
|location|GeoJSON|
|time|epoch time (seconds since 1970)|
|Optional Fields||
|*accuracy*|double|
|*speed*|double|
|*altitude*|double|
|*bearing*|double|

|GeoJSON||
|-------|---|
|type|String (should be “Point” for objects or geofence centers, “Polygon” for geofences)|
|coordinates|[lng (double), lat (double)] or [[[lng (double), lat (double)],…]]|

|JSON Object||
|-----------|---|
|clientID|api client identifier||customID|custom object identifier in client side|
|position|JSON Position|
|Optional Fields||
|*categories*|[String]|
|*tags*|[String]|
|*related*|[customID]|

|JSON Results||
|------------|---|
|dis|double|
|obj|JSON Object|

|JSON Geofence||
|-------------|---|
|clientID|api client identifier|
|geofenceID|custom object identifier in client side|
|location|GeoJSON|
|center|GeoJSON|

MongoDB Setup
-------------

These indexes should be applied to the MongoDB database:

```
> db.objectlist.ensureIndex({clientID:1, customID:1}, {unique:true})
> db.lastpositionlist.ensureIndex({clientID:1, customID:1}, {unique:true})
> db.lastpositionlist.ensureIndex({’position.location’:‘2dsphere’})
> db.geofencelist.ensureIndex({clientID:1, geofenceID:1}, {unique:true})
> db.geofencelist.ensureIndex({’location’:‘2dsphere’})
```

And these collections should be manually created:

|Collection|Format|
|----------|------|
|clientidlist|{clientID:String, clientSecret:String}|
|clientcallbacklist|{clientID:String, geofence:{host:“example.com”, path:“/examplepath”, isActive:Boolean}, savePosition:{host:“example.com”, path:“/examplepath”, isActive:Boolean}}|

Headers
-------

|Header||
|------|---|
|X-Timestamp|Epoch time in seconds|
|X-Authentication-Type|“SHA1”|
|X-Signature|SHA1 hash of dataString|

dataString should be a String with the following format:

“‘query/body as a JSON object string’ + ‘epoch time in seconds’ + ‘clientSecret’”

**Example:** {"categories":["cat1"],"tags":["tag1"],"related":["otherCustomID"]}1402590257nomelase

If the query/body is empty, then the dataString should be {}:

**Example:** {}1402590257nomelase

**For Testing:**
clientID: “testapp”
clientSecret: “nomelase”

Usage
-----

All URLs should be prefixed by **/geo/:clientID**

### Add Object

Adds an object/objects to the data base with the given field values, if provided

|/objects/:customIDs|POST|
|-------------------|----|
|Optional Fields||
|*categories*|[String]|
|*tags*|[String]|
|*related*|[customID]|

**Example:** POST /geo/testapp/objects/obj1,obj2 {related:[“obj3”]}

### Add Fields

Adds field values to an object/objects already in the database. If the object is not in the database, it will not be created through this command

|/objects/:customIDs|PUT|
|-------------------|---|
|Optional Fields||
|*categories*|[String]|
|*tags*|[String]|
|*related*|[customID]|

**Example:** PUT /geo/testapp/objects/obj1 {related:[“obj2”,“obj4”]}

### Get Objects

Returns objects matching the specified parameters in “near” and “matching”.

|/objects/:customIDs?|GET|
|--------------------|---|
|Optional Fields| |
| *near* | JSON Near |
| *matching* | JSON Matching |
|RES | |
| [JSON Results] \|\| [JSON Object] | |

|JSON Near||
|---------|---|
| location | GeoJSON |
| distance | double (km) |
|Optional Fields| |
| *offset* | time offset from now (seconds) or 24hr ago if null |


|JSON Matching||
|-------------|---|
|Optional Fields||
|*categories*|[String]|
|*tags*|[String]|
|*related*|[customID]|

There are many options for this query. If “near” is not provided, there will be no position information returned.

To get all objects except obj1 who have obj2 in [related][]

**Example:** GET /geo/testapp/objects/obj1?matching[related][]=obj2

If no fields are provided, it will return the database entries on the given objects:

**Example:** GET /geo/testapp/objects/obj1,obj2

If no customIDs are provided, it will return the database entries for all objects:

**Example:** GET /geo/testapp/objects

### Delete Fields

Removes the provided field values from an object/objects already in the database.

|/objects/:customIDs|DELETE|
|-------------------|------|
|Optional Fields||
|*categories*|[String]|
|*tags*|[String]|
|*related*|[customID]|

**Example:** DELETE /geo/testapp/objects/obj1?related=obj2

If no fields are provided, the object/objects will be deleted:

**Example:** DELETE /geo/testapp/objects/obj2

### Save Position

Adds a position to the database for the given object

****\* NOTE: If the position’s time is older than the most recent position submitted, then the position will not be accepted. Each position submitted must be newer than the previous position.

|/positions/:customID|POST|
|--------------------|----|
|position|JSON Position|

**Example:** POST /geo/testapp/positions/obj1 {"location": {"type":"Point", "coordinates":[2.168, 41.387]}, "time":1402407865}

### Get Positions

Returns a position/positions for the give object

|/positions/:customID|GET|
|--------------------|---|
|Optional Fields||
|*last*|boolean|
|*start*|epoch time (seconds since 1970) or 24h ago if null|
|*end*|epoch time (seconds since 1970) or now if null|
|RES||
|[JSON Position]||

**Example:** GET /geo/testapp/positions/obj1?start=0

To only get the most recent position:

**Example:** GET /geo/testapp/positions/obj1?last=true

### Add Geofence

Adds a geofence to the database at the given coordinates, and with the given radius (will be stored as a square, where each side’s length is 2\*distance)

|/geofences/:geofenceID|POST|
|----------------------|----|
|lng|double|
|lat|double|
|distance|double (km)|

**Example:** POST /geo/testapp/geofences/geofence1 {"lat":41, "lng":2, "distance":5}

### List Geofences

Returns all geofences in the database for this client

|/geofences|GET|
|----------|---|
|RES||
|[JSON Geofence]||

**Example:** GET /geo/testapp/geofences

h3. Delete Geofence

Deletes the given geofence/geofences from the database

|/geofences/:geofenceIDs|DELETE|
|-----------------------|------|

**Example:** DELETE /geo/testapp/geofences/geofence1
