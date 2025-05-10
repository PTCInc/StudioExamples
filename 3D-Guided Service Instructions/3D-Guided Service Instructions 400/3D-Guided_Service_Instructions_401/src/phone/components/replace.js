// $scope, $element, $attrs, $injector, $sce, $timeout, $http, $ionicPopup, and $ionicPopover services are available


var colorPalette = { 
  					'red'    : 'rgba(255,0,0,1);',
  					'green'  : 'rgba(0,255,0,1);',
  					'blue'   : 'rgba(0,0,255,1);',
  					'yellow' : 'rgba(255,255,0,1);',
  					'purple' : 'rgba(255,0,255,1);',
  					'cyan'   : 'rgba(0,255,255,1);',
  					'white'  : 'rgba(245,245,245,1);',
  					'black'  : 'rgba(10,10,10,1);'
                 };

$scope.setColor = function(model) {
    //
    //if color is defined, let's set it
    //first, lets check that we have a part to set the color for
    if ($scope.app.params.color != undefined) {
      
        var paintColor = colorPalette[$scope.app.params.color];
        if (paintColor != undefined) 
             PTC.Metadata.fromId(model)
                         .then((metadata) => {
            //
            // set a variable named options. this variable will become an array of ID paths that fit the input text.
            // 'like' will look for a partial text match to what is typed in. use 'same' to get an exact match 
            var toPaint1 = metadata.find('painted').like('true').getSelected();
            if (toPaint1 != undefined && toPaint1.length > 0) {
                toPaint1.forEach(function(p) {
                                 tml3dRenderer.setColor(model+'-'+p,paintColor);
                });
            }
        })
        //catch statement if the promise of having a part with metadata is not met
        .catch((err) => { console.log('metadata extraction failed with reason : ' + err) })
    }
}

//modeLoaded event listener triggers when the model has completed loading
$scope.$on('modelLoaded', function (event,model) {
    $scope.setColor(model);
  
    $scope.$watch('app.params.color',function() {
      $scope.setColor(model);
    });
  
}); //modelLoaded event function end

//
// code to get (fetch) content from remote web service
//
const username = 'Administrator'; //$scope.app.params.username; // 'sghee';
const password = 'pRJvhu4xdEZPSC';//$scope.app.params.password; // 'thunderB1rd6!';
const config = {
  url: "",
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
$scope.askIRS = function() {
  var scanID = $scope.view.wdg.scanner.scannedValue;
  
  // first, lets check its UPCA (12 digits)
  if (scanID.length != 12) return;
  // reformat it into an epc code
  var epc = `urn:epc:id:sgtin:`+scanID.slice(0,7)+'.00'+scanID.slice(7,11);
  console.log(epc);
  
  $scope.app.params.partNo = undefined;

  //
  // call the ID resolution service to get the content mapped to the target ID
  //
  var final = `${config.url}/ExperienceService/id-resolution/resolutions?key=${epc}`;
    
  window.fetch(final, config.requestConfig)
        .then(res => {
            
    res.json().then(obj => {
    
      let resolutions = obj.resolutions;
      if (resolutions.length > 0) {
            
        resolutions.forEach(function(r) {

          // debug
          console.log(`(${r.resourcetype}) - ${r.value}\n`);
              
          switch(r.resourcetype) {
            case 'partNumber': $scope.app.params.partNo = r.value; break;  // 
            case 'color'     :     
              twx.app.fn.triggerDataService($scope.app.params.thing, 'setColor', {color: r.value}); 
              break;  // 
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