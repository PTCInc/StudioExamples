// $scope, $element, $attrs, $injector, $sce, $timeout, $http, $ionicPopup, and $ionicPopover services are available

// function used in metadata find() call to check for the existance (= present + has a value)
//
var ifExists = (m,b,c) => {
  
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

// function to get the filename of the seuqence to load - inputs are the model (holding the sequences)
// and the figure/sequence name
//
var getNamedSequence = (model, figname) => {
  
  // does the model have any sequences?
  //
  if ($scope.view.wdg[model] != undefined && $scope.view.wdg[model].sequenceList != undefined)
    
    // if yes, find the associated sequence (file) to load, based on the name
    //
    return $scope.view.wdg[model].sequenceList.filter( (v) => { return (v.name == figname) });
}

// called when a model is loaded
//
$scope.$on("modelLoaded", (event, model) => {
  
  // rip through the metadata to find if this has specific semantic elements described
  //
  if ($scope.view.wdg[model] != undefined && 
      $scope.view.wdg[model].src != undefined && 
      $scope.view.wdg[model].src.length > 0) PTC.Metadata.fromId(model)
              .then  ( (metadata) => { 
  
  
    // we are looking for something called "explode". If it exists, the assumption here is that it is then name of 
    // a figure/sequence to 'play' to view an exploded view.
    //
    var e = ifExists(metadata,"explode");
    
    if (e.length ==1) {  // ensure there is only one
    
      $scope.view.wdg.explodeButton.visible = true;  // show the "explode" button (onclick is wired to function below)
      
      var efn = metadata.get(e[0],"explode");         // get the value of "explode" - the name of the explosion seqeuence
      $scope.exploder = getNamedSequence(model, efn); // find the sequence with thin name
    }
    else {
      
      // otherwise hide the button - there's nothing to explode 
      //
      $scope.view.wdg.explodeButton.visible = false;
    }
    
    // this is just a test - check to see if a random property exists anywhere
    //
    console.log(ifExists(metadata, "sausage").length);  // for the test models, this should be zero
    
    // are any of the parts marked as 'illustration'?  if so, show a button (click handler below)
    //
    $scope.illustrated = ifExists(metadata, "illustration");
    $scope.view.wdg.illustratedButton.visible = $scope.illustrated.length > 0;
    
    $scope.view.wdg.resetButton.visible = $scope.view.wdg.illustratedButton.visible || $scope.view.wdg.explodeButton.visible;
    
    $scope.view.wdg.displayInformationPopup.visible = true;
    
    // now find some interesting properties
    //
    var interestingProperties = ["weight","supplier","cost"]; 
    var plist = [];
    
    interestingProperties.forEach( (p) => {
      // if there are any of these properties, anywhere, create a button that will show them
      //
      if (ifExists(metadata,p).length > 0) {
        
        // the button in this case is an entry in a list widget - when the list is tapped, we show that item
        //
        plist.push( { name:p, model:model } );
      }
    })
    // show the list (it could be empty)
    //
    $scope.view.wdg.labelList.list = plist;
    
    // ensure the model itself is not visible - we are using a physical target, so reality will do most of the rendering
    // we will only show the augmentations we need
    //
    $scope.view.wdg.dynamicModel.visible = twx.app.isPreview();
    
  })
  
})

$scope.labels = {};
// renders text onto an image - this is the foundation of all 3d labels, they are just images...
// in this example, there is not base image as such, we just create an empty canvas and draw onto that
// 
var renderText = (title) => {
  return new  Promise( (ready,failed) => {  
        
    // generate the text ... note this uses fixed font size, colours etc.
    //
    var c    = document.createElement('canvas');
    c.width  = 1024;
    c.height = 256;
 
    var t = c.getContext('2d');
    
    // black text    
    //
    t.font        = '72px sans-serif';
    t.fillStyle   = 'rgba(40,47,53,0.9)';
    t.strokeStyle = 'rgba(40,47,53,0.9)';
    t.baseline    = "middle";
    t.lineWidth   = 1;
        
    // position the text (roughly) central on the image
    //
    var tw = t.measureText(title);
    var x  = (c.width - tw.width)/2;
    var y  = (c.height/2) + 72;        
    t.fillText(title,x,y);
    t.strokeText(title,x,y);    
           
    // places the rectangle in the back of the text
    // 
    t.globalCompositeOperation='destination-over';
    
    var padding = 25;
    
    t.strokeStyle = "white";
	t.beginPath();
	t.roundRect(x - padding, y - 72 - padding/2, t.measureText(title).width + padding*2, 72 + padding*2, [100]); // 72px is the font size
    t.fillStyle = 'rgba(255,255,255,0.6)';
	t.fill();
	t.stroke();
    
    //complete the promise
    //
    ready(c.toDataURL());
  })
}

// create a new tml 3d image to host the label text.
//
var addNamedLabelAt = (name, pos, txtimg) => {
  var params = {
    tracker : 'tracker1',
    id      : name,
    src     : txtimg,
    parent  : undefined,
    leaderX : undefined, // Unused leaderX
    leaderY : undefined, // Unused leaderY
    anchor  : undefined, // Unused anchor
    width   : undefined,
    height  : 0.03, 
    pivot   : 5,    // center
    preload : false
  };

  tml3dRenderer.add3DImage(params, () => {
  
    // we added the image, so set the location
    tml3dRenderer.setProperties(name, { hidden: false, billboard: true, decal:true });
    tml3dRenderer.setTranslation(name, pos.x, pos.y, pos.z);
    tml3dRenderer.setScale(name,1,1,1);
    $scope.$applyAsync();
                                  
  },
  (err) => {
  
    // something went wrong
    //
    console.log(`add3DImage failed to add new image: ${JSON.stringify(err)}`); 
  });
  
  $scope.$applyAsync();
}

// hide all existing labels
//
var hideLabels = () => {
  for(var lname in $scope.labels) {
    if ($scope.labels[lname].visible) {
      tml3dRenderer.setProperties(lname, {hidden: true});
      $scope.labels[lname].visible = false;
    }
  }
}

// reset everything
//
$scope.reset = () => {
  hideLabels();
  
  // and remove all highlights
  if ($scope.illustrated != undefined) $scope.illustrated.forEach( (id) => {
    tml3dRenderer.setProperties("dynamicModel-"+id, { shader:"", hidden: !twx.app.isPreview() }); 
  })
  
  //disconnect any sequence
  $scope.view.wdg.dynamicModel.sequence = undefined;
}

// called when the user taps on a property in the named list
//
$scope.showPropertyValues = () => {
  
  // which list item did the user click?
  //
  var param = $scope.view.wdg.labelList.list.current;
  
  // build/reuse labels
  // first thing we do is hide any existing labels
  //
  hideLabels();
  
  // in this simple example, we'll use the ocurrence paths to maintain a list of valid labels
  //
  function getValues(idpath) {
    var res = this.get(idpath, param.name);
    var retn = {id:idpath, name:param.name, value: res};
    return retn
  }
  
  // first of all, lets get all the metadata values or this property
  //
  var plist = [];
  
  PTC.Metadata.fromId(param.model)
              .then  ( (metadata) => { 
    
    plist = ifExists(metadata, param.name, getValues);
  
  })
  
  PTC.Structure.fromId(param.model)
               .then  ( (structure) => {
     
    // iterate over plist, getting/setting location if we need it
    //
    plist.forEach( (item) => {
     
      // does this label already exist?
      //
      var lname = "label" + item.id;
      if ($scope.labels[lname] != undefined) {
        
        // it exists, so it has location, just make it visible and assign new value
        //
        $scope.labels[lname].value   = item.value;
        $scope.labels[lname].visible = true;
        
        renderText(item.value).then( (txtimg) => {
          tml3dRenderer.setTexture   (lname, txtimg);
          tml3dRenderer.setProperties(lname, { hidden: false, billboard: true, decal:true });
        })
        
      } else {
        
        // looks like we need to create it
        //
        var bbox = structure.getBounds(item.id); 
        var loc  = bbox.center; // box center

        $scope.labels[lname] = { value: item.value, visible: true, location: loc };
        renderText(item.value).then( (txtimg) => {
          addNamedLabelAt(lname, loc, txtimg);
        })
      }
      
    })
  })
}

// called when a sequencer definition file (pvi) has been successfully loaded - the sequencer is ready to play
//
$scope.$on("sequenceloaded", (seq) => {
  twx.app.fn.triggerWidgetService('dynamicModel', 'playAll');
})

// called if user clicks the "explode" button
//
$scope.explodeModel = () => {
  $scope.view.wdg.dynamicModel.sequence = $scope.exploder[0].filename;
}

// called if user clicks the "illustrated" button
//
$scope.showIllustrated = () => {
  $scope.illustrated.forEach( (id) => {
    var shader = "highlight;r f 1;g f 0.5;b f 0.25;a f 1" + (twx.app.isPreview() ? ";virtualMode f 1.0":"");
    tml3dRenderer.setProperties("dynamicModel-"+id, { shader:shader, hidden:false });
  })
}

// called if the user taps on a part
//
$scope.$on("userpick", (event, model, type, args) => {
  
  PTC.Metadata.fromId(model)
              .then  ( (metadata) => {
    
    var pathId = JSON.parse(args).occurrence;

    var sid = metadata.get(pathId, "illustration");
    // find this named illustration in the model sequenceList (metadata)
    //
    
    // dangerous to assume everything has a seuqenceList, so lets check first
    //
    if ($scope.view.wdg.dynamicModel.sequenceList != undefined) {
      
      // if it does, lets' see if we can find the named sequence
      //
      var fid = $scope.view.wdg.dynamicModel.sequenceList.filter( (v) => { return (v.name == sid) });
      
      // and apply if we found it
      //
      $scope.view.wdg.dynamicModel.sequence = fid.length > 0 ? fid[0].filename : undefined;
    }
  })
});