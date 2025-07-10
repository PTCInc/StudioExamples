// wait for model to load ...
//
// Setup the appearance of the model to use an edge/contour appearance representation
// Note: this requires your model to have edge wireframe representation stored in the model
//
$scope.$on("modelLoaded", () => {
  
  // when it loads, assign a shader - in this case, lets use a bright green contour shader
  //
  $scope.view.wdg.dynamicModel.shader = "contour;lineR f 0;lineG f 1;lineB f 0;lineA f 0.5";
})