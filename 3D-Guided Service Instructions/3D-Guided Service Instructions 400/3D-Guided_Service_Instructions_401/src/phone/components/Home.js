// $scope, $element, $attrs, $injector, $sce, $timeout, $http, $ionicPopup, and $ionicpopup services are available

$scope.sessionData = undefined;
$scope.$on('userpick', function (event, targetName, targetType, eventData) {
  
  //
  //Look at model and see if it has metadata. If it does, then execute the below code and create an object called metadata
  PTC.Metadata.fromId(targetName,$scope.sessionData)
      .then((metadata) => {
    //
    // variable to pull the value for the occurrence property in the eventData JSON object from the model. Create variable for the currently selected part
    var pathId = JSON.parse(eventData).occurrence
    $scope.currentSelection = targetName + "-" + pathId
    
    var welding = true;
    while (welding) {
      
      //if the item is welded/combined in illustrate then walk up the hierarchy
      var sbominfo = metadata.get(pathId, 'sBOM_Welded');
      if (sbominfo != undefined && sbominfo === 'true') {
        
        // try the parent until we reach the root, in wihch casse abort
        var child = pathId.lastIndexOf('/');
        if (child === 0)
          return;
        pathId = pathId.substr(0,child);
      } else {
        welding	= false;
      }
    }

    //create an object with the properties below that are based on attribute names from Creo Illustrate for this model. use metadata.get to obtain the data from the JSON properties for this occurrence.
    $scope.meta = {
      partName        : metadata.get(pathId, 'Display Name'),
      instructionName : metadata.get(pathId, 'illustration'),
      partNumber      : metadata.get(pathId, 'partNumber'),
    } //scope.meta object
      
    // set itemName app parameter to be equal to the partName variable, same relationship with itemNumber and partNumber. Set the itemCount to 1 for the purpose of this section.
    $scope.app.params.itemName   = $scope.meta.partName;
    $scope.app.params.itemNumber = $scope.meta.partNumber;
    $scope.app.params.itemCount  = 1;
    
    $scope.target = targetName
    
    // call the getPriceAvailability ThingWorx service based on partNumber
    twx.app.fn.triggerDataService('shoppingThing', 'getOptionsPriceAvailability', {pid: $scope.meta.partNumber})
    
    }) //end brackets for PTC API and .then 
  //
  //catch statement if the promise of having a part with metadata is not met
  .catch((err) => { console.log('metadata extraction failed with reason : ' + err) })

}) //end brackets for userpick function. Will continue to move throughout code

$scope.$on('getOptionsPriceAvailability.serviceInvokeComplete', function(evt) {  
  //
  // variable holding all data for the current row in the infotable
  var rowData = twx.app.mdl['shoppingThing'].svc['getOptionsPriceAvailability'].data;
  
  // this is potentially a list of options - colors
  var prices = [];
  rowData.forEach(function(row) {
    if (row.avail === true) prices.push({ color: row.option, price: parseFloat(row.price), pid:row.pid});
  });
  $scope.app.params.priceInfo = prices;
  
  // price is going to be the variable that is referenced in the popup, while the app parameter priceInfo will be used for adding the total in the cart
//  var price = rowData.avail === true ? '$' + rowData.price : 'UNAVAILABLE';
//  $scope.app.params.priceInfo = rowData.avail === true ? parseFloat(rowData.price) : undefined
  
  // create a variable to bring the $scope.meta object into this event listener as a local object
  let meta = $scope.meta
  
  // adds an ionic popup when a part is clicked
  $scope.popup = $ionicPopup.show({
    //
    //call the function for setting the template
    template: $scope.setTemplate(meta, prices),
    //
    // set the scope for the popup
    scope: $scope

  }); //end of ionic popup 

  //highlight the chosen item and set the shader to true
  $scope.hilite([$scope.currentSelection], true);

  //function for removing the highlight
  $scope.hiliteOff = function() {
   $scope.hilite([$scope.currentSelection], false)
  }; // end of hiliteOff function

  // function to be bound to the Disassemble button in the popup
  $scope.disassemble = function () {
    //
    // set an object that targets the model and its instruction property
    var modelObject = { model: $scope.target, instruction: 'l-Creo 3D - ' + meta.instructionName + '.pvi' };
    //
    // set the sequence for the quadcopter to be the name of the associated instruction
    $scope.view.wdg.quadcopter.sequence = modelObject.instruction
  } //disassemble function end
  
  $scope.thisPrice = rowData.price
})// getPriceAvailability end

//function for using the userInput text box to search for parts
$scope.findMeta = function () {
  //
  //set a variable for comparing the user input to the value of the partno application parameter
  var searchNum = $scope.app.params.partno;

  //
  // instead of using metadata from just the picked part, use metadata from the whole model. If resolved, proceed
//  PTC.Metadata.fromData('quadcopter',$scope.sessionData)
  PTC.Metadata.fromId('quadcopter',$scope.sessionData)
    .then((metadata) => {
        //
        // set a variable named options. this variable will become an array of ID paths that fit the input text.
        // 'like' will look for a partial text match to what is typed in. use 'same' to get an exact match 
        var options = metadata.find('partNumber').like(searchNum).getSelected();

        //
        // if the text input leads to a part number so that there is an entry in the options array
        if (options != undefined && options.length > 0) {
            //
            // set an empty array called ID. This array will house the parts that contain the entered part number
            var identifiers = []
            //
            // for each entry in the options array, push that value with 'quadcopter-' at the beginning into the ID array 
            options.forEach(function (i) {
                identifiers.push('quadcopter-' + i)
            }) //end forEach

            //
            // highlight each object in the identifiers array with the shader
            $scope.hilite(identifiers, true)

            //
            // function for removing the highlight
            var removeHilite = function (refitems) {
                //
                // return the hilite function with a value of false to the given part(s)
                return function () {
                    $scope.hilite(refitems, false)
                } // end of return function
            } // end of turning off hilite

            //
            // remove the highlight of the selected part(s) after 3000 ms
            $timeout(removeHilite(identifiers), 3000)

          } //end if statement 
    }) // end .then

      //catch statement if the promise of having a part with metadata is not met
      .catch((err) => { console.log('metadata extraction failed with reason : ' + err) })
} // end findMeta function


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

//modeLoaded event listener triggers when the model has completed loading
$scope.$on('modelLoaded', function (event,model) {
    $scope.setColor(model);
  
    $scope.$watch('app.params.color',function() {
      $scope.setColor(model);
    });
/*
    //and get the metadata
    var final = `${config.url}/ExperienceService/content/reps/${$scope.app.params.model.split('.')[0]}.metadata.json`;
    fetch(final, config.requestConfig)
      .then(res => {  
        res.json().then(obj => {
          $scope.sessionData = obj;
        });
    });
*/
  
}); //modelLoaded event function end

//sequenceloaded event listener triggers when the sequence property is updated
$scope.$on('sequenceloaded', function (event) {
    //
    // call a widget service to trigger the quadcopter model to play all steps for the given sequence
    $scope.setColor('quadcopter');
    twx.app.fn.triggerWidgetService('quadcopter', 'playAll');
}); //serviceloaded event function end

//resetit function
$scope.resetit = function () {
    //
    //set the sequence property of the quadcopter model to blank
    $scope.view.wdg.quadcopter.sequence = ''

}//resetit function end

//highlight function. Inputs are the selected part and a boolean for hilite
$scope.hilite = function (items, hilite) {
    //
    //iterate over each item that is used as an imported variable for the function using .forEach to look at each value that comes in the items input
    items.forEach(function (item) {
        //
        //set the properties of the TML 3D Renderer to highlight the selected item using a TML Text shader. "green" is the name of the script for the TML Text.
        tml3dRenderer.setProperties(item, hilite === true ? { shader: "green", hidden: false, opacity: 0.9, phantom: false, decal: true }
                                                          : { shader: "", hidden: false, opacity: 1.0, phantom: false, decal: false });
    }) //foreach function end
} //hilite function end

$scope.app.params.cartButton = "Cart"; // set cartButton app parameter to be "Cart". This will bind to the Text property for the buttonCart button
$scope.cart = {}; // declare empty object called cart

// function for adding a selected part to the cart   
$scope.addToCart = function (pid,price) {
  // call addToCart service from ThingWorx
  twx.app.fn.triggerDataService('cartThing', 'addToCart', {pid: pid, qty: 1, price: price});
} //end of addToCart function

$scope.$on('addToCart.serviceInvokeComplete', function(evt) {
 //$scope.updateCart() 
})

$scope.$on('getCart.serviceInvokeComplete', function(evt) {
})


// function for setting the template for the Ionic popup
$scope.setTemplate = function (meta, prices) {
  
  // if there is a disassembly sequence associated with the part, create a Disassemble button in the popup, if not, no button will appear
  var instr = meta.instructionName != undefined && meta.instructionName.length > 0 ? '<div class="btndisassemble" ng-click="hiliteOff();popup.close();disassemble();">Disassemble</div>' 
                                                                                   : '';
  // if price != unavailable, define an add to cart button and have the price displayed in the popup, if it is unavailable, just display price
  var addTo = '';
  if (prices != undefined) prices.forEach(function(price) {
    addTo = addTo + '&nbsp;</div><div class="btnadd" ng-click="hiliteOff();popup.close();addToCart(\''+price.pid+'\','+price.price+');">('+price.color+') Add to Cart $'+price.price+'</div>';
  });
  
  // build the template for the popup
  var template = '<div>' + $scope.app.params.itemCount + 'x &nbsp;' + meta.partNumber + '&nbsp;</br>' + 
                 meta.partName + '&nbsp;</br>' + 
                 addTo  +
                 instr +
                 '<div class="btncontinue" ng-click="hiliteOff();popup.close();">Continue</div>' ;
  
  // return the template variable when this function is called
  return template
}

//
// code to get (fetch) content from remote web service
//

