package net.techideas.geolocalapiandroid;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.apache.http.Header;

import android.util.Log;

import com.loopj.android.http.JsonHttpResponseHandler;

public class GeoLocalClientCallback{

	public static abstract class GeoLocalJSONArrayCallback extends JsonHttpResponseHandler{
		@Override
	    public void onSuccess(int statusCode, Header[] headers, JSONObject response) {
	        try {
				if (response.getInt("error") == 0){
					handleResponse(response.getJSONArray("response"));
				} else {
					handleError(response.getInt("error"),response.getString("cause"));
				}
			} catch (JSONException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			}
	    }
		
		@Override
	    public void onFailure(int statusCode, Header[] headers, Throwable throwable, JSONObject errorResponse) {
	        Log.e("GeoLocalAPI", throwable.toString());
	    }
		
		protected abstract void handleResponse(JSONArray response);
	    
		protected abstract void handleError(Integer errorCode, String cause);
	}
	
	public static abstract class GeoLocalJSONObjectCallback extends JsonHttpResponseHandler{
		@Override
	    public void onSuccess(int statusCode, Header[] headers, JSONObject response) {
	        try {
				if (response.getInt("error") == 0){
					handleResponse(response.getJSONObject("response"));
				} else {
					handleError(response.getInt("error"),response.getString("cause"));
				}
			} catch (JSONException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			}
	    }
		
		@Override
	    public void onFailure(int statusCode, Header[] headers, Throwable throwable, JSONObject errorResponse) {
	        Log.e("GeoLocalAPI", throwable.toString());
	    }
		
		protected abstract void handleResponse(JSONObject response);
	    
		protected abstract void handleError(Integer errorCode, String cause);
	}
	
	public static abstract class GeoLocalStringCallback extends JsonHttpResponseHandler{
		@Override
	    public void onSuccess(int statusCode, Header[] headers, JSONObject response) {
	        try {
				if (response.getInt("error") == 0){
					handleResponse(response.getString("response"));
				} else {
					handleError(response.getInt("error"),response.getString("cause"));
				}
			} catch (JSONException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			}
	    }
		
		@Override
	    public void onFailure(int statusCode, Header[] headers, Throwable throwable, JSONObject errorResponse) {
	        Log.e("GeoLocalAPI", throwable.toString());
	    }
		
		protected abstract void handleResponse(String response);
	    
		protected abstract void handleError(Integer errorCode, String cause);
	}
}

