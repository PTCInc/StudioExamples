// declare which metadata key (name of property) that we are going to use to drive this experience - in this
// example, we will use partNumber - we will identify and collect all items with
// unique partnumber property values, and display these in a way that the experience user
// can then identify and view content - other property/values - on the selected partNumbered item
//
var metadataKey = "partNumber";

// function used in metadata find() call to check for the existence (= present + has a value)
//
function ifExists(m,b,c) {
  var existFunc = (a) => {
    var prop = a;
    
    return function(idpath) {
      const pn = this.get(idpath, prop);
      return pn != undefined && pn.length > 0;
    }
  }
  
  var exp = m.find(b).findCustom(existFunc(b)); 
  return exp.getSelected(c);
}

// called when a model has finished loading, we can use this to access information that the the model
// might be holding e.g. metadata
// 
$scope.$on("modelLoaded", (event, model) => {
  
  
  // rip through the metadata to find if this has specific semantic elements described
  //
  PTC.Metadata.fromId(model)
              .then  ( (metadata) => { 
  
    
    // debug - if you want to learn what the metadata looks like, try this
    // console.log("my metadata is: \n"+JSON.stringify(metadata, undefined, 2));
    
    // this function is called from the metadata iterator ifExists that is 
    // declared above; it will extract all the items with the specified metadata key
    //
    var getValues = function(idpath) {
      var res  = this.get(idpath, metadataKey);
      var retn = {id:idpath, value: res};
      return retn
    }
  
    // get all the items with specific metadata key
    //
    var numbers = ifExists(metadata, metadataKey, getValues);
    
    if (numbers == undefined)
    {
      console.log("didn't find any part matching metadata key, return");
      return;
    }
    
    // we've finished loading the model, so lets hide the UI that was asking uus to wait patiently...
    $scope.view.wdg.loadingPopup.visible = false;
    // and lets show the the partslist UI, with all the parts we've identified...
    $scope.view.wdg.partsListPopup.visible = true;
    
    // we want a unique list of numbers - no duplicates - use the javascript 'set' feature to generate a unique list
    let s = new Set(numbers.map((e) => { return e.value; }));
    let parts = [...s];
    
    // from the parts, generate the list
    var plist = [];
    parts.forEach( (p) => { plist.push( { name:p, model:model }); })
    
    // show the list (it could be empty)
    $scope.view.wdg.partsList.list = plist;
    
    // in a physical setup (not preview) we do NOT show the virtual model - we use the real one
    $scope.view.wdg.dynamicModel.opacity = 0.2;                 // in preview, we show a faded model
    $scope.view.wdg.dynamicModel.visible = twx.app.isPreview(); // in real life, we dont show the model at all
  })
  
})

// call this function to highlight the list of selected parts
//
var highlightParts = (selectedList, modelId) => {
  
  var highlightedList = [];
  
  // run over all the items in the list and assign the highlight shader
  selectedList.forEach( (partId) => {
    
    var renderingPartId = modelId + "-" + partId;
    var shader = "highlight;r f 1;g f 0.5;b f 0.25;a f 1" + (twx.app.isPreview() ? ";virtualMode f 1.0":"");
    tml3dRenderer.setProperties(renderingPartId, { shader: shader, opacity: 1.0, hidden: false });
   
    // and keep a record of what we highlighted - so that we wan undo it later
    //
    highlightedList.push(renderingPartId);
    
  });
  
  return highlightedList;
}

// call this function to clear the highlights
//
var highlightReset = (highlightedList) => {
  
  // run over all the items in the list and unsasign the shader
  //
  highlightedList.forEach( (modelIdpartId) => {
                          
    //setting hidden to -1 is a special setting that says "inherit hidden from my parent"
    tml3dRenderer.setProperties(modelIdpartId,{ shader:"", opacity: 0.2, hidden: -1 });
    
  });
  return [];
}

// used to track which items are highlighted
$scope.lit = [];


// called when the user taps on a property in the named list, or taps on a part in the view - this changes the 'current' field
//
$scope.$watch(
  
  () => { 
    
    return ($scope.view.wdg.partsList.list != undefined && 
            $scope.view.wdg.partsList.list.current != undefined) ? JSON.stringify($scope.view.wdg.partsList.list.current) : "";
  },
  //value == 'currentSelectedPart',
  (value) => {
    
    highlightReset($scope.lit);
      
    var partNumber = JSON.parse(value);
        
    // first of all, lets get all the metadata values for this selected item
    //
    var plist = [];
    PTC.Metadata.fromId(partNumber.model)
                .then  ( (metadata) => { 

      // find all the items with this partnumber
      //
      plist = metadata.find(metadataKey).like(partNumber.name);
          
      if (plist == undefined)
      {
        return;
      }

      // highlight those items
      //
      $scope.lit = highlightParts(plist.getSelected(), partNumber.model);
          
      // now find some interesting properties
      //
      var interestingProperties = ["cost","supplier","weight","partNumber"]; 

      // this function (declared inline) is used to get the property values (see above) for eeach of the items 
      // in the previously acquired partnmubered plist - it will iterate through each item (idpath) and get the 
      // properties for each item; if found, they are captured into an array of name=value pairs.
      //
      var getInteresting = (ip) => {
        var ilist = ip;
            
        return function(idpath) {
          const res = this.get(idpath, ilist);

          var retobj = { path:idpath };
              
          if (res != undefined && res.length === ilist.length) for (var p=0;p<ilist.length;p++) {
         
            // add each result as a new property in the return body  
            retobj[ilist[p]] = res[p];
          }

          return retobj;
        }
      }

      // get a list of items with this property set
      //
      plist = plist.getSelected(getInteresting(interestingProperties));
          
      // helper function to get and format the properties - this generates a list of name|value pairs
      //
      var getNameValues = (items) => {
        var nv = [];
        items.forEach( (i) => {
           Object.keys(i).forEach( (j) =>{
             if (interestingProperties.includes(j)) nv.push({name:j, value:i[j]});
           })
        })
        return nv;
      }
          
      // we need to turn this into a list of item/name/value
      //
      $scope.view.wdg.propertiesList.data = getNameValues(plist);
      //
      // and show the popup
      //
      twx.app.fn.triggerWidgetService("propertyPopup", 'showpopup')
          
    })
  }
);


// called if the user taps on a part
$scope.$on("userpick", (event, model, type, args) => {
  
  PTC.Metadata.fromId(model)
              .then  ( (metadata) => {
    
    var pathId = JSON.parse(args).occurrence;
    
    var sid = metadata.get(pathId, metadataKey);
    
    var findMetaDataKey = (p) => { 
      // simple inline closure that will test if the item name is the value specificed (p in this case)
      // this gets called for all items in the list (see findIndex, below)
      //
      return function(v) { return v.name == p; }
    }
    
    // work out which row we need to select
    //
    var fid = $scope.view.wdg.partsList.list.findIndex(findMetaDataKey(sid));
    
    // return call here if not found
    
    // ... and mark it as selected 
    //
    $scope.view.wdg.partsList.list.forEach( (v,i) => { v._isSelected = (i == fid) });
    
    // and get the row to highlight in 3d
    //
    $scope.view.wdg.partsList.list.current = $scope.view.wdg.partsList.list.filter( (v,i) => { return i == fid })[0];
  })
});