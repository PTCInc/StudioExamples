
// called when a model has finished loading, we can use this to access information that the the model
// might be holding e.g. metadata
// 
$scope.$on("modelLoaded", (event, model) => {

  PTC.Structure.fromId(model)
               .then  ( (structure) => {
     
    // find the root item and get its bounding box data 
    var bbox = structure.getBounds("/"); 
    var midl = bbox.center;
    var base = bbox.min.y; // lowest point

    // we will center the xz of the box over the center of the spatial target
    $scope.view.wdg.dynamicModel.x = 0.0 - midl.x;
    $scope.view.wdg.dynamicModel.z = 0.0 - midl.z;
    // and we will move the box vertically to sit the base (lowest point) on the surface that the target is located
    $scope.view.wdg.dynamicModel.y = 0.0 - base;
    $scope.$applyAsync();
  })

  // we've finished loading the model, so lets hide the UI that was asking us to wait patiently...
  $scope.view.wdg.loadingPopup.visible = false;
})

