package net.techideas.geolocalapiandroid;

import java.text.DecimalFormat;

import net.techideas.geolocalapiandroid.GeoLocalAPIObjectFields.ObjectField;
import net.techideas.geolocalapiandroid.GeoLocalClientCallback.*;

import org.apache.commons.codec.binary.Hex;
import org.apache.commons.codec.digest.DigestUtils;
import org.apache.http.Header;
import org.apache.http.message.BasicHeader;

import android.content.Context;
import android.util.Log;

import org.json.*;

public class GeoLocalAPI {
	
	private String clientSecret;
	private String clientID;
	
	public GeoLocalAPI(String clientID, String clientSecret){
		this.clientID = clientID;
		this.clientSecret = clientSecret;
	}
	
	public void addObject(Context c, String customID, GeoLocalAPIObjectFields fields, GeoLocalJSONArrayCallback callback){
		// construct the parameters to send
		JSONObject object = new JSONObject();
		try {
			object.put("clientID", this.clientID);
			object.put("customID", customID);
			
			if (fields != null){
				for (ObjectField field:ObjectField.values()){
					object.put(field.getName(), fields.getItems(field));
				}
			}
			
		} catch (JSONException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}

		//construct headers
		Header[] headers = constructHeaders(object);
		
		GeoLocalClient.post(c, "/addobject", object, headers, callback);
	}
	
	public void addObject(Context c, String customID, GeoLocalJSONArrayCallback callback){
		addObject(c, customID, null, callback);
	}
	
	public void addFields(Context c, JSONArray customIDs, GeoLocalAPIObjectFields fields, GeoLocalStringCallback callback){
		// construct the parameters to send
		JSONObject object = new JSONObject();
		try {
			object.put("clientID", this.clientID);
			object.put("customIDs", customIDs);
			
			for (ObjectField field:ObjectField.values()){
				object.put(field.getName(), fields.getItems(field));
			}
			
		} catch (JSONException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}

		//construct headers
		Header[] headers = constructHeaders(object);
		
		GeoLocalClient.post(c, "/addfields", object, headers, callback);
	}
	
	public void deleteFields(Context c, JSONArray customIDs, GeoLocalAPIObjectFields fields, GeoLocalStringCallback callback){
		// construct the parameters to send
		JSONObject object = new JSONObject();
		try {
			object.put("clientID", this.clientID);
			object.put("customIDs", customIDs);
			
			for (ObjectField field:ObjectField.values()){
				if (fields.getItems(field).length()>0){
					object.put(field.getName(), fields.getItems(field));
				}
			}
			
		} catch (JSONException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}

		//construct headers
		Header[] headers = constructHeaders(object);
		
		GeoLocalClient.delete(c, "/deletefields", object, headers, callback);
	}
	
	public void savePosition(Context c, String customID, JSONObject position, GeoLocalJSONArrayCallback callback){
		// construct the parameters to send
		JSONObject object = new JSONObject();
		try {
			object.put("clientID", this.clientID);
			object.put("customID", customID);
			object.put("position", position);
			
			//construct headers
			Header[] headers = constructHeaders(object);
			
			GeoLocalClient.post(c, "/saveposition", object, headers, callback);
		} catch (JSONException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}
	
	public void lastPosition(Context c, String customID, GeoLocalJSONObjectCallback callback){
		// construct the parameters to send
		JSONObject object = new JSONObject();
		try {
			object.put("clientID", this.clientID);
			object.put("customID", customID);
		} catch (JSONException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		
		//construct headers
		Header[] headers = constructHeaders(object);
		
		GeoLocalClient.get(c, "/lastposition", object, headers, callback);
	}
	
	public void nearbyObjects(Context c, String customID, JSONObject location, Double distance, Double offset, GeoLocalJSONArrayCallback callback){
		nearbyObjects(c, customID, location, distance, offset, null, callback);
	}
	
	public void nearbyObjects(Context c, String customID, JSONObject location, Double distance, GeoLocalJSONArrayCallback callback){
		nearbyObjects(c, customID, location, distance, null, null, callback);
	}
	
	public void nearbyObjects(Context c, String customID, JSONObject location, Double distance, Double offset, GeoLocalAPIObjectFields fields, GeoLocalJSONArrayCallback callback){
		// construct the parameters to send
		
				JSONObject object = new JSONObject();
				DecimalFormat format = new DecimalFormat("###.####");
				try {
					object.put("clientID", this.clientID);
					object.put("customID", customID);
					object.put("location", location);
					object.put("distance", format.format(distance));
					if (offset != null){
						object.put("offset", format.format(offset));
					}
					if (fields!=null){
						for (ObjectField field:ObjectField.values()){
							if (fields.getItems(field).length()>0){
								object.put(field.getName(), fields.getItems(field));
							}
						}
					}
				} catch (JSONException e) {
					// TODO Auto-generated catch block
					e.printStackTrace();
				}
				
				//construct headers
				Header[] headers = constructHeaders(object);
				
				GeoLocalClient.get(c, "/nearbyobjects", object, headers, callback);
	}
	
	public void objectPath(Context c, String customID, Double start, Double end, GeoLocalJSONArrayCallback callback){
		// construct the parameters to send
		JSONObject object = new JSONObject();
		DecimalFormat format = new DecimalFormat("###.####");
		try {
			object.put("clientID", this.clientID);
			object.put("customID", customID);
			if (start != null){
				object.put("start", format.format(start));
			}
			if (end != null){
				object.put("end", format.format(end));
			}
		} catch (JSONException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		
		//construct headers
		Header[] headers = constructHeaders(object);
		
		GeoLocalClient.get(c, "/objectpath", object, headers, callback);
	}
	
	public void objectPath(Context c, String customID, GeoLocalJSONArrayCallback callback){
		objectPath(c, customID, null, null, callback);
	}
	
	public void addGeofence(Context c, String geofenceID, Double lat, Double lng, Double distance, GeoLocalJSONArrayCallback callback){
		// construct the parameters to send
		JSONObject object = new JSONObject();
		try {
			object.put("clientID", this.clientID);
			object.put("geofenceID", geofenceID);
			object.put("lat", lat);
			object.put("lng", lng);
			object.put("distance", distance);
		} catch (JSONException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		
		//construct headers
		Header[] headers = constructHeaders(object);
		
		GeoLocalClient.post(c, "/geofence", object, headers, callback);	
	}
	
	public void listGeofences(Context c, GeoLocalJSONArrayCallback callback){
		// construct the parameters to send
		JSONObject object = new JSONObject();
		try {
			object.put("clientID", this.clientID);
		} catch (JSONException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		
		//construct headers
		Header[] headers = constructHeaders(object);
		
		GeoLocalClient.get(c, "/geofence", object, headers, callback);		
	}
	
	public void deleteGeofence(Context c, String geofenceID, GeoLocalJSONObjectCallback callback){
		// construct the parameters to send
		JSONObject object = new JSONObject();
		try {
			object.put("clientID", this.clientID);
			object.put("geofenceID", geofenceID);
		} catch (JSONException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		
		//construct headers
		Header[] headers = constructHeaders(object);
		
		GeoLocalClient.delete(c, "/geofence", object, headers, callback);	
	}
	
	private Header[] constructHeaders (JSONObject object){
		
		String paramsString = object.toString();
		Long time = System.currentTimeMillis()/1000;
		String fullString = paramsString + time + clientSecret;
		String signature = new String(Hex.encodeHex(DigestUtils.sha1(fullString)));
		
		
		Header[] headers = new Header[3];
		headers[0] = new BasicHeader("X-Timestamp", time.toString());
		headers[1] = new BasicHeader("X-Authentication-Type", "SHA1");
		headers[2] = new BasicHeader("X-Signature", signature);
		Log.w("GeoLocalAPI", "Signature: "+fullString);
		Log.w("GeoLocalAPI", "Hashed Signature: "+signature);
		return headers;
	}
	
	public JSONObject constructPosition(JSONObject location, Double time, Double speed, Double altitude, Double bearing) throws JSONException{
		
		JSONObject position = new JSONObject();
		position.put("location", location);
		position.put("time", time);
		if (speed != null){
			position.put("speed", speed);
		}
		if (altitude != null){
			position.put("altitude", altitude);
		}
		if (bearing != null){
			position.put("bearing", bearing);
		}
		return position;
	}
	
	public JSONObject constructPosition(JSONObject location, Double time) throws JSONException{
		return constructPosition(location, time, null, null, null);
	}
	
	public JSONObject constructLocation(Double lat, Double lng) throws JSONException{
		return constructLocation(lat, lng, false);
	}
	
	public JSONObject constructLocation(Double lat, Double lng, boolean useStrings) throws JSONException{
		JSONObject location = new JSONObject();
		location.put("type", "Point");
		JSONArray coordinates = new JSONArray();
		if (useStrings){
			DecimalFormat format = new DecimalFormat("###.####");
			coordinates.put(format.format(lng));
			coordinates.put(format.format(lat));
		} else {
			coordinates.put(lng);
			coordinates.put(lat);
		}
		location.put("coordinates", coordinates);
		return location;
	}
}

