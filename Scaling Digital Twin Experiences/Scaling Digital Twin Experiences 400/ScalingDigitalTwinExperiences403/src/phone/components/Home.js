// $scope, $element, $attrs, $injector, $sce, $timeout, $http, $ionicPopup, and $ionicpopup services are available

let targetGuideDiv = document.querySelector("div.targetGuide");
if (targetGuideDiv) {
  targetGuideDiv.style.backgroundImage = "url('" + $scope.app.params.guide + "')";
}
if ($scope.app.params.target.startsWith('vuforia-model')) {
  $scope.app.params.angle  = 0;
  $scope.app.params.offset = 0;
}

$scope.$on('trackingacquired', function(evt, target, type, meta) {
  console.log(target,type,meta);
  $scope.askIRS(twx.app.isPreview() ? 'imgDT2' : target);
});


//
// code to get (fetch) content from remote web service
//
const username = $scope.app.params.username;
const password = $scope.app.params.password;
const config = {
  url: "",//http://pp-21031612294a.portal.ptc.io:8080",
  requestConfig: {
    //mode: 'cors',
    credentials: 'include',
    headers: {
      'Authorization': 'Basic ' + btoa(username + ':' + password),
      'Accept' : 'application/json'
    }
  }
};

const fetch = (url, config) => {
  return window.fetch(url, config);
};

//
////////////////////////////////////////////////////////
//
$scope.askIRS = function(targetID) {
  
  $scope.app.params.meta = undefined;
  $scope.app.params.data = undefined;

  //
  // call the ID resolution service to get the content mapped to the target ID
  //
  var final = `${config.url}/ExperienceService/id-resolution/resolutions?key=urn:curriculum:targetid:` + targetID;
    
  window.fetch(final, config.requestConfig)
        .then(res => {
            
    res.json().then(obj => {
    
      let resolutions = obj.resolutions;
      if (resolutions.length > 0) {
            
        resolutions.forEach(function(r) {

          // debug
          console.log(`(${r.resourcetype}) - ${r.value}\n`);
              
          switch(r.resourcetype) {
            case 'meta' : $scope.app.params.meta  = r.value; break;  // this will start loading the model
            case 'model': $scope.app.params.model = r.value; break;  // this will start loading the model
            case 'color': $scope.app.params.color = r.value; break;  // will set the color which will be applied after the model loads
          }
        });             
      }
      else {
        console.log('something went wrong');
      }
      $scope.$applyAsync();
      
    })
    .catch(res => {
      console.log('something else went wrong',res);
    });
      
  })
  .catch(res => {
    console.log('something more went wrong',res);
  });
  
}

//
//modelLoaded event listener triggers when the model has completed loading
//
$scope.$on('modelLoaded', function (event,model) {
  
  //and get the metadata from the location passed in the IRS call
  var final = `${$scope.app.params.meta}`;
  fetch(final, config.requestConfig).then(res => {  
    res.json().then(obj => {
      $scope.app.params.data = obj;
        
      //
      // call setColor function to change the color of the model
      $scope.setColor(model)
    });
  })
  .catch(res => {
    console.log('something more went wrong trying to access metadata',res);
  });
  

}) // modelloaded end


//
// object to hold color possibilities in RGBA format
//
var colorPalette = {
  'red'    : 'rgba(255,0,0,1);',
  'green'  : 'rgba(0,255,0,1);',
  'blue'   : 'rgba(0,0,255,1);',
  'yellow' : 'rgba(255,255,0,1);',
  'purple' : 'rgba(255,0,255,1);',
  'cyan'   : 'rgba(0,255,255,1);',
  'white'  : 'rgba(245,245,245,1);',
  'black'  : 'rgba(10,10,10,1);'
}

//
// function for setting the color based on the color app parameter
//
$scope.setColor = function (model) {
 
  //
  // if color is defined, set color
  // check if there is a part that can have its color changed
  if ($scope.app.params.color != undefined) {
    
    var paintColor = colorPalette[$scope.app.params.color];
    if (paintColor != undefined && $scope.app.params.data != undefined)
      PTC.Metadata.fromData('quadcopter', $scope.app.params.data)
    			  .then((metadata) => {
        
        //
        // create variable named toPaint to become an array of ID paths that fit the input text
        // "like" will look for a partial text match to what is typed in. use 'same' to get an exact match
        var toPaint = metadata.find('painted').like('true').getSelected();
        
        //
        // if statement for determining parts that have the painted attribute and setting their color using the tml 3d renderer
        if (toPaint != undefined && toPaint.length > 0 ) {
          
          toPaint.forEach(function(p) {
            
            tml3dRenderer.setColor(model+ '-' +p,paintColor);
            
          }) // for each end
          
        } // if statement end
        
      }) //.then end
    
    //
    // catch statement for if this operation fails
    .catch((err) => { console.log("metadata extraction failed with reason : " + err) })
    
  } // end of if statement for paintColor
  
} // end of setColor function

