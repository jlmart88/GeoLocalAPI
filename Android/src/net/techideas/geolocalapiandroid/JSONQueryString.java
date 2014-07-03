package net.techideas.geolocalapiandroid;
import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import java.util.Iterator;
import java.util.List;
import java.util.Stack;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class JSONQueryString {
	private Stack<Object> stack = new Stack<Object>();
	
	public String buildQueryString(Object object) throws JSONException{
		return buildQueryString(object, null);
	}
	
	public String buildQueryString(Object object, String name) throws JSONException{
		String sep = "&";
		String eq = "=";
		if (object == null) {
			return name != null ? name + eq : "";
		}
		Class<? extends Object> cls = object.getClass();  
		if (cls == Boolean.class || cls == Integer.class || cls == Double.class || cls == Long.class || cls == String.class ) {
		  if (cls == Double.class){
			  Double num = (Double) object;
			  if (((Long)num.longValue()).doubleValue() == num){
				  return escape(name) + eq + escape(((Long)num.longValue()).toString());  
			  } 
		  } 
		  return escape(name) + eq + escape(object.toString());
		}  
		if (cls.isArray() || cls==JSONArray.class || object instanceof List<?>) {
		  if (cls==JSONArray.class){
			  JSONArray array = (JSONArray) object;
			  StringBuilder string = new StringBuilder();
			  name = name+"[]";
			  for (int i = 0, l = array.length(); i < l; i ++) {
			    string.append(buildQueryString(array.get(i), name));
			    string.append(sep);
			  }
			  if (string.length()>0){
				  string.delete(string.lastIndexOf(sep),string.length());
			  }
			  return string.toString();
		  }else if (object instanceof List<?>){
			  @SuppressWarnings("unchecked")
			List<Object> array = (List<Object>) object;
			  StringBuilder string = new StringBuilder();
			  name = name+"[]";
			  for (int i = 0, l = array.size(); i < l; i ++) {
			    string.append(buildQueryString(array.get(i), name));
			    string.append(sep);
			  }
			  if (string.length()>0){
				  string.delete(string.lastIndexOf(sep),string.length());
			  }
			  return string.toString();
		  } else {
			  Object[] array = (Object[]) object;
			  StringBuilder string = new StringBuilder();
			  name = name+"[]";
			  for (int i = 0, l = array.length; i < l; i ++) {
			    string.append(buildQueryString(array[i], name));
			    string.append(sep);
			  }
			  if (string.length()>0){
				  string.delete(string.lastIndexOf(sep),string.length());
			  }
			  return string.toString();
		  }
		}
		
		// Check for cyclical references in nested objects
		for (int i = stack.size() - 1; i >= 0; --i) if (stack.elementAt(i) == object) {
		  throw new Error("buildQueryString error. Cyclical reference");
		}
		
		stack.push(object);
		
		StringBuilder string = new StringBuilder();
		String begin = name!=null ? name + "[" : "";
		String end = name!=null ? "]" : "";
		JSONObject json = ((JSONObject) object);
		@SuppressWarnings("unchecked")
		Iterator<String> keys = json.keys();
		while (keys.hasNext()){
			String key = keys.next();
			if (json.has(key)){
				String n = begin + key + end;
				string.append(buildQueryString(json.get(key), n));
				string.append(sep);
			}
		}
		
		stack.pop();
		if (string.length()>0){
			string.delete(string.lastIndexOf(sep),string.length());
		}
		if (string.toString()=="" && name!=null) return name + "=";
		return string.toString();
	}
	
	/**
	   * Encodes the passed String as UTF-8 using an algorithm that's compatible
	   * with JavaScript's <code>encodeURIComponent</code> function. Returns
	   * <code>null</code> if the String is <code>null</code>.
	   * 
	   * @param s The String to be encoded
	   * @return the encoded String
	   */
	  public static String escape(String s)
	  {
	    String result = null;

	    try
	    {
	      result = URLEncoder.encode(s, "UTF-8")
	                         .replaceAll("\\+", "%20")
	                         .replaceAll("\\%21", "!")
	                         .replaceAll("\\%27", "'")
	                         .replaceAll("\\%28", "(")
	                         .replaceAll("\\%29", ")")
	                         .replaceAll("\\%7E", "~");
	    }

	    // This exception should never occur.
	    catch (UnsupportedEncodingException e)
	    {
	      result = s;
	    }

	    return result;
	  }  
}
