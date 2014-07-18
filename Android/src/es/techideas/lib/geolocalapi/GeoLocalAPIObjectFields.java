package es.techideas.lib.geolocalapi;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class GeoLocalAPIObjectFields {
	
	public enum ObjectField {
		TAGS("tags"),
		CATEGORIES("categories"),
		RELATED("related");
		
		private String value;
		
		ObjectField(String value){
			this.value = value;
		}
		
	    public String getName() {
	        return value;
	    }	
	}
	
	private JSONObject fieldsJSON;
	
	public GeoLocalAPIObjectFields() throws JSONException{
		fieldsJSON = new JSONObject();
		for (ObjectField field : ObjectField.values()){
			this.fieldsJSON.put(field.getName(), new JSONArray());
		}
	};
	
	public void addItems(ObjectField[] fields, String[] items) throws JSONException{
		for (ObjectField field : fields){
			JSONArray array = this.fieldsJSON.getJSONArray(field.getName());
			for (String item: items){
				array.put(item);
			}
		}
	}
	
	public void addItems(ObjectField field, String[] items) throws JSONException{
		addItems(new ObjectField[]{field},items);
	}
	
	public void addItems(ObjectField[] fields, String item) throws JSONException{
		addItems(fields, new String[]{item});
	}
	
	public void addItems(ObjectField field, String item) throws JSONException{
		addItems(new ObjectField[]{field},new String[]{item});
	}
	
	public JSONArray getItems(ObjectField field) throws JSONException{
		return this.fieldsJSON.getJSONArray(field.getName());
	}
}
