package es.techideas.lib.geolocalapi;

import java.io.UnsupportedEncodingException;

import org.apache.http.Header;
import org.apache.http.entity.ByteArrayEntity;
import org.json.JSONException;
import org.json.JSONObject;

import android.content.Context;

import com.loopj.android.http.*;

public class GeoLocalClient {
	 private static final String BASE_URL = "http://dev.techideas.net:3000/geo/";

	  private static AsyncHttpClient client = new AsyncHttpClient();
	  
	  public static void get(Context c, String url, JSONObject object, Header[] headers, AsyncHttpResponseHandler responseHandler) {
		  try {
			  JSONQueryString query = new JSONQueryString();
			  String resource = getAbsoluteUrl(url);
			  String fullUrl;
		
			  fullUrl = resource + '?' + query.buildQueryString(object);
			  client.get(c, fullUrl, headers, new RequestParams(), responseHandler);
			} catch (JSONException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	     
	  }
	  
	  public static void post(Context c, String url, JSONObject object, Header[] headers, AsyncHttpResponseHandler responseHandler) {
		  String jsonString = object.toString();
		  ByteArrayEntity entity;
		try {
			entity = new ByteArrayEntity(jsonString.getBytes("UTF-8"));
			client.post(c, getAbsoluteUrl(url), headers, entity, "application/json", responseHandler);
		} catch (UnsupportedEncodingException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}   
	  }
	  
	  public static void put(Context c, String url, JSONObject object, Header[] headers, AsyncHttpResponseHandler responseHandler) {
		  String jsonString = object.toString();
		  ByteArrayEntity entity;
		try {
			entity = new ByteArrayEntity(jsonString.getBytes("UTF-8"));
			client.put(c, getAbsoluteUrl(url), headers, entity, "application/json", responseHandler);
		} catch (UnsupportedEncodingException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}   
	  }
	  
	  public static void delete(Context c, String url, JSONObject object, Header[] headers, AsyncHttpResponseHandler responseHandler) {
		  try {
			  JSONQueryString query = new JSONQueryString();
			  String resource = getAbsoluteUrl(url);
			  String fullUrl;
		
			  fullUrl = resource + '?' + query.buildQueryString(object);
			  client.delete(c, fullUrl, headers, new RequestParams(), responseHandler);
			} catch (JSONException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	  }

	  private static String getAbsoluteUrl(String relativeUrl) {
	      return BASE_URL + relativeUrl;
	  }
}
