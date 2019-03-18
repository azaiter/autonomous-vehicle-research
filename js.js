init_lat = 42.3501855;
init_lon =  -83.067744;
maxRange = .03;
trackPoints = [];

var start;
var randCoord;
var lat_long;
var map;

function findCoordinates(lat, long, range, numberOfPoints=16){
    // How many points do we want? (should probably be function param..)
    var degreesPerPoint = 360 / numberOfPoints;

    // Keep track of the angle from centre to radius
    var currentAngle = 0;

    // The points on the radius will be lat+x2, long+y2
    var x2;
    var y2;
    // Track the points we generate to return at the end

    for(var i=0; i < numberOfPoints; i++){
        // X2 point will be cosine of angle * radius (range)
        x2 = Math.cos(currentAngle) * range;
        // Y2 point will be sin * range
        y2 = Math.sin(currentAngle) * range;

        // Assuming here you're using points for each x,y..             
        newLat = lat+x2;
        newLong = long+y2;
        lat_long = new google.maps.LatLng(newLat,newLong);          
        trackPoints[i] = lat_long;  


        // Shift our angle around for the next point
        currentAngle += degreesPerPoint;
    }
    // Return the points we've generated
    //gets random coordinate from our array of coords
  
    randCoord = trackPoints[Math.floor(Math.random() * trackPoints.length)];
    /*
    document.getElementById('randCoord').innerHTML = randCoord;
    document.getElementById('points').innerHTML = trackPoints;
    */
}


function generateRandomCoordinatesWithinARange(lat, long, range, numberOfPoints=16){
        var trackPoints = [];
        var degreesPerPoint = 360 / numberOfPoints;
        var currentAngle = 0;
    var x2;
    var y2;
        for(var i=0; i < numberOfPoints; i++){
        x2 = Math.cos(currentAngle) * range;
        y2 = Math.sin(currentAngle) * range;

        var newLat = lat+x2;
        var newLong = long+y2;
        var newLat_long = new google.maps.LatLng(newLat,newLong);          
        trackPoints[i] = newLat_long;  
        currentAngle += degreesPerPoint;
    }
        return trackPoints[Math.floor(Math.random() * trackPoints.length)];
}


var directionsDisplay;
var directionsService = new google.maps.DirectionsService();

function initialize() {
  directionsDisplay = new google.maps.DirectionsRenderer();
  var mapOptions = {
    zoom: 12,
    center: new google.maps.LatLng(init_lat, init_lon)
  };
  map = new google.maps.Map(document.getElementById('map-canvas'),
      mapOptions);
  directionsDisplay.setMap(map);
}

var outputResponses = [];
var outputResponsesRaw = [];

function calcRoute() {
  //Fires up random coordinate generation based upon distance input
  //findCoordinates(init_lat,init_lon,generateRandomFloat(0.00, maxRange));  
  //Displays start and chosen random coordinate - for debugging only

  //document.getElementById('buttonClick').innerHTML = src + dst;  
  //Get's value from doc to use for start value
  //var start = document.getElementById('start').value;
  //(parseInt($('#source-radius').val())/100000)
        //console.log(`src : ${src} ... dest: ${dst}`);

        let responses = {};
        let points = {};

        //for(let i=0; i<20; i++){
                let src = generateRandomCoordinatesWithinARange(parseFloat($('#source-lat').val()), parseFloat($('#source-lon').val()), (parseInt($('#source-radius').val())/111111));
                let dst = generateRandomCoordinatesWithinARange(parseFloat($('#destination-lat').val()), parseFloat($('#destination-lon').val()), (parseInt($('#destination-radius').val())/111111));

          var request = {
                  origin:src,
                  destination:dst,
                  travelMode: google.maps.TravelMode.DRIVING,
                  //provideRouteAlternatives: true
          };  

          directionsService.route(request, function(response, status) {
                  console.log(status);
                if (status == google.maps.DirectionsStatus.OK) {
                        ///////responses[i.toString()] = response;
                  //directionsDisplay.setDirections(response);
                  renderDirections(response);
                  
                  outputResponses.push(JSON.stringify(response));
                  outputResponsesRaw.push(JSON.stringify(response));
                  $("#routesOutput").val(JSON.stringify(outputResponses));
                  console.log("response:::", JSON.stringify(outputResponses));
                  // you could go over them and draw all alternatives.
                response.routes[0].overview_path.forEach(x=>{
                        console.log(x.toString());
                        if(x in points){
                                points[x].push(response);
                        }
                        else{
                                points[x] = [response];
                        }
                });
                } else {
                  alert('You broke it.');
           } 
          });
        //}

        // setTimeout(function(){
                // let max = 0;
                // let arrayToShow = [];
                // for(x in points){
                        // if(points[x].length > max){
                                // max = points[x].length;
                                // arrayToShow = points[x];
                        // }
                // }
                // console.log("arr to show", arrayToShow)
                // for(let i=0; i<arrayToShow.length; i++){
                        // renderDirections(arrayToShow[i]);
                // }
                // console.log(points);

        // }.bind(this), 5000);

}

function applyCustomData(){
        let data = JSON.parse($("#routesOutput").val());
        console.log(data);
        for(let i=0;i<data.length;i++){
                renderDirections(JSON.parse(data[i]));
        }
}


function generateRandomFloat(min, max) {
    return (Math.random() * (max - min) + min);
};

google.maps.event.addDomListener(window, 'load', initialize);
var markerCounter = 0;
function renderDirections(result) {
  var route = result.routes[0];
  var directionsRenderer = new google.maps.DirectionsRenderer({
              suppressInfoWindows: true,
              suppressMarkers: true,
              polylineOptions: {
                strokeColor: getRandomColor()
              },
              map: map
            })
  directionsRenderer.setMap(map);
  directionsRenderer.setDirections(result);
  markerCounter++;
  addMarker(route.legs[0].start_location, "S" + markerCounter);
  addMarker(route.legs[0].end_location, "D" + markerCounter);

}

function addMarker(position, i) {
  return new google.maps.Marker({
    // @see http://stackoverflow.com/questions/2436484/how-can-i-create-numbered-map-markers-in-google-maps-v3 for numbered icons
    icon: 'http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=' + i + '|FF0000|000000',
    position: position,
    map: map
  })
}

function getRandomColor() {
  var letters = '0123456789ABCDEF';
  var color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}