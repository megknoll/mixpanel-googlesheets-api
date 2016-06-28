/********************************************************************************
 * Mixpanel Segmentation Data Export
 *
 * Retrieves data from Mixpanel via the Data Export API Segmentation end point.
 * 
 * orignal @author https://github.com/melissaguyre (Melissa Guyre)
 * updates by @author https://github.com/megknoll (Meghan Knoll)
 * 
 * For more information querying Mixpanel Data Export APIs see
 * https://mixpanel.com/docs/api-documentation/data-export-api
 * https://mixpanel.com/docs/api-documentation/exporting-raw-data-you-inserted-into-mixpanel
 *
 *********************************************************************************/

/**
 * Fill in your account's Mixpanel Information here
 */
var API_KEY = '';
var API_SECRET = '';

/**
 * Define the tab # at which to create new sheets in the spreadsheet.
 * 0 creates a new sheet as the first sheet. 
 * 1 creates a new sheet at the second sheet and so forth.
 */
var CREATE_NEW_SHEETS_AT = 5;

/**
 * Helpful date constants
 */

var DATE_LAUNCH = '2016-06-06';
var DATE_YESTERDAY = getMixpanelDate(1);
var DATE_WEEK = getMixpanelDate(7);
var DATE_MONTH = getMixpanelDate(30);
var DATE_THREEMONTH = getMixpanelDate(90);
var DATE_SIXMONTH = getMixpanelDate(180);
var DATE_YEAR = getMixpanelDate(365);

/**
 * Define API Queries - Get data for an event, segmented and filtered by properties.
 *
 * For full details on API Queries https://mixpanel.com/docs/api-documentation/data-export-api
 * Sheet Name - What you want the sheet with your data to be called.
 * event - The event that you wish to segment on. Can also be an array of multiple events. 
 * where - The property expression to segment the event on.
 * type - This can be 'general', 'unique', or 'average'.
 * unit - The level of granularity of the data you get back. "minute", "hour", "day", "week", or "month"
 * interval - The number of "units" to return data for - minutes, hours, days, weeks, or months.1 will return data for the current unit, etc.
 * on - Property to display data by (optional)
 * limit - # of results
 */

// Retention API Object
var API_RETENTION_PARAMETERS = {  
  'iOS Retention Curve':{'born_where':'(properties["$os"])=="iPhone OS"','where':'(properties["$os"])=="iPhone OS"','retention_type':'birth','unit':'week','event':'Video Start','born_event':'Video Start','from_date':DATE_THREEMONTH,'to_date':DATE_YESTERDAY},
  'Android Retention Curve':{'born_where':'(properties["$os"])=="Android"','where':'(properties["$os"])=="Android"','retention_type':'birth','unit':'week','event':'Video Start','born_event':'Video Start','from_date':DATE_THREEMONTH,'to_date':DATE_YESTERDAY}
};

// Segementation API Object
var API_PARAMETERS = {  
  'iOS Video Starts' : {'event':'Video Start','where':'(properties["$os"])=="iPhone OS"','unit':'day','type':'general','from_date':DATE_LAUNCH,'to_date':DATE_YESTERDAY},
  '7-Day Video Ranker' : {'event':'Video Start','type':'general','on':'(properties["title"])','limit':'10','unit': 'month','from_date':DATE_WEEK,'to_date':DATE_YESTERDAY}
};


/***********************************************************************************
 * Fetch the data
 **********************************************************************************/

// Creates a menu in spreadsheet for easy user access to fetch data function
function onOpen() {
  var activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  activeSpreadsheet.addMenu(
      "Mixpanel", [{
        name: "Get Mixpanel Data", functionName: "getMixpanelData"
      }]);
}

// Iterates through the api queries object, fetches data for each sheet
function getMixpanelData() {
  for (var i in API_PARAMETERS)
  {
    fetchMixpanelSegmentationData(i,API_PARAMETERS[i]);
  }
  
  for (var i in API_RETENTION_PARAMETERS)
  {
    fetchMixpanelRetentionData(i,API_RETENTION_PARAMETERS[i]);
  }
}

/**
 * Forms a segementation API url for the given api query object, calls the mixpanel API, gets the results, pushes it to a new data table. 
 *    - Calls getApiParameters to form the main api parameters
 *    - Calls getApiExpirationTime to form expire parameter
 *    - Calls insertSheet with the new data table.
 */
function fetchMixpanelSegmentationData(sheetName,params) {

  var expires = getApiExpirationTime();
  var urlParams = getApiParameters(expires, params);
  
  urlParams = urlEncode(urlParams);
  
  var apiendpoint = "http://mixpanel.com/api/2.0/segmentation?";
  var url = apiendpoint + urlParams;
  Logger.log("THE URL  " + url);
  
  var response = UrlFetchApp.fetch(url);
  
  var json = response.getContentText();
  var dataAll = JSON.parse(json);
  
  var data = [];
  data.push(["report", "time period","data"])
  var map = dataAll.data.values;
  
  for(var i in map){
    for(var x in map[i]){
      data.push([i,x,map[i][x]]);
    }
  }
   insertSheet(sheetName, data);
}

/**
 * Forms a retention API url for the given api query object, calls the mixpanel API, gets the results, pushes it to a new data table. 
 *    - Calls getApiParameters to form the main api parameters
 *    - Calls getApiExpirationTime to form expire parameter
 *    - Calls insertSheet with the new data table.
 */
function fetchMixpanelRetentionData(sheetName,params) {

  var expires = getApiExpirationTime();
  var urlParams = getApiParameters(expires, params);
  
  urlParams = urlEncode(urlParams);
  
  var apiendpoint = "http://mixpanel.com/api/2.0/retention?";
  var url = apiendpoint + urlParams;
  Logger.log("THE URL  " + url);
  
  var response = UrlFetchApp.fetch(url);
  
  var json = response.getContentText();
  var dataAll = JSON.parse(json);
  
  var data = [];
  data.push(["date", "first","counts"])
  var map =  dataAll;
  
  for(var i in map){
    var dataLine = [i,map[i]["first"]];
    
    for(var x = 0; x < map[i]["counts"].length; x++){
      dataLine.push(map[i]["counts"][x]);
    }
    
    data.push(dataLine);
  }
  insertSheet(sheetName, data);
}


/**
* Helper function - encodes any special characters in the url params
* 
**/
function urlEncode(urlParams){
  // Add URL Encoding for special characters which might generate 'Invalid argument' errors. 
  // Modulus should always be encoded first due to the % sign.
  urlParams = urlParams.replace(/\%/g, '%25');   
  urlParams = urlParams.replace(/\s/g, '%20');
  urlParams = urlParams.replace(/\[/g, '%5B');
  urlParams = urlParams.replace(/\]/g, '%5D');
  urlParams = urlParams.replace(/\"/g, '%22');
  urlParams = urlParams.replace(/\(/g, '%28');
  urlParams = urlParams.replace(/\)/g, '%29');
  urlParams = urlParams.replace(/\>/g, '%3E');
  urlParams = urlParams.replace(/\</g, '%3C');
  urlParams = urlParams.replace(/\-/g, '%2D');   
  urlParams = urlParams.replace(/\+/g, '%2B');   
  urlParams = urlParams.replace(/\//g, '%2F');
  return urlParams;
}

/** 
 * Returns an array of query parameters for the given query object
 */
function getApiParameters(expires, params) {
  var apiCall = ['api_key=' + API_KEY,'expire=' + expires];
  
  for (var i in params) {
     apiCall.push(i + "=" + params[i]);
   }
  
  var sig = getApiSignature(apiCall);
  apiCall = apiCall.join('&') + "&sig=" + sig;
  
  return apiCall;
}

/**
 * Creates a google sheet and sets the name, index and data.
 */

function insertSheet(sheetName, values) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName) ||
    ss.insertSheet(sheetName, CREATE_NEW_SHEETS_AT);
    sheet.clear();

  for (var i = 0; i < values.length; ++i) {    
    var data = [values[i]];
    var range = sheet.getRange((i + 1), 1, 1, data[0].length);
    range.setValues(data);
  }
  
}


/***********************************************************************************
 * Mixpanel API Authentication
 *
 * Calculating the signature is done in parts: 
 * sort the parameters you are including with the URL alphabetically, 
 * join into a string resulting in key=valuekey2=value2, 
 * concatenate the result with the api_secret by appending it, 
 * and lastly md5 hash the final string.
 *
 * Data Export API Authentication Requirements doc
 * https://mixpanel.com/docs/api-documentation/data-export-api#auth-implementation
 *
 * Resources
 * Computing md5 http://productforums.google.com/forum/#!topic/apps-script/iFKH6s-0On8
 * https://developers.google.com/apps-script/reference/utilities/utilities?hl=en#computeDigest(DigestAlgorithm,String)
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/join
 **********************************************************************************/

/** 
 * Sorts provided array of parameters
 *
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
 */
function sortApiParameters(parameters) { 
  var sortedParameters = parameters.sort();
   
  return sortedParameters;
}

/** 
 * 3.5 Returns 10 minutes from current time in UTC time for API call expiration
 *
 * Resources
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now
 * http://stackoverflow.com/questions/3830244/get-current-date-time-in-seconds
 */
function getApiExpirationTime() {
  var expiration = Date.now() + 10 * 60 * 1000;
  
  return expiration;
}

/** 
 * Returns API Signature calculated using api_secret. 
 */
function getApiSignature(params) {
  var sortedParameters = sortApiParameters(params).join('') + API_SECRET;
  // Logger.log("Sorted Parameters  " + sortedParameters);
  
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, sortedParameters);

  var signature = '';
  for (j = 0; j < digest.length; j++) {
      var hashVal = digest[j];
      if (hashVal < 0) hashVal += 256; 
      if (hashVal.toString(16).length == 1) signature += "0";
      signature += hashVal.toString(16);
  }
  
  return signature;
}



/** 
 *********************************************************************************
 * Date helper
 *********************************************************************************
 */

// Returns a date string in Mixpanel date format '2013-09-11', daysPast 0 => Today, daysPast 1 => Yesterday, etc. 
function getMixpanelDate(daysPast){
  var today = new Date();
  var pastDate = new Date(today);
  pastDate.setDate(today.getDate() - daysPast);
  
  var dd = pastDate.getDate();
  var mm = pastDate.getMonth() + 1;
  var yyyy = pastDate.getFullYear();
  
  if (dd < 10) {
    dd = '0' + dd;
  }
  if (mm < 10) {
    mm = '0' + mm;
  }
  
  pastDate = yyyy + '-' + mm + '-' + dd;
  return pastDate;
}

