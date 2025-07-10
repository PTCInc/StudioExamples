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


// function for setting the color based on the color app parameter
//
$scope.setColor = (model) => {
 
  // if color is defined, set color
  // check if there is a part that can have its color changed
  //
  if ($scope.app.params.color != undefined) {
    
    var paintColor = colorPalette[$scope.app.params.color];
    if (paintColor != undefined)
      PTC.Metadata.fromId('dynamicModel')
    			  .then( (metadata) => {
        //
        // create variable named toPaint to become an array of ID paths that fit the input text
        // "like" will look for a partial text match to what is typed in. use 'same' to get an exact match
        //

        //use this line until the model is properly decorated with the "painted" attribute        
        var toPaint = metadata.find('painted').like('true').getSelected();
        
        // if statement for determining parts that have the painted attribute and setting their color using the tml 3d renderer
        //
        if (toPaint != undefined && toPaint.length > 0 ) {
          
          toPaint.forEach(function(p) {
            
            tml3dRenderer.setColor(model+ '-' +p,paintColor);
            
          })
          
        }
        
      })
    
    //
    // catch statement for if this operation fails
    .catch((err) => { console.log("metadata extraction failed with reason : " + err) })
    
  }
  
}

//modelLoaded event listener triggers when the model has completed loading
//
$scope.$on('modelLoaded', (event,model) => {
  
  // call setColor function to change the color of the model
  //
  $scope.view.wdg.loadingPopup.visible = false;
  $scope.setColor(model)
  
})
