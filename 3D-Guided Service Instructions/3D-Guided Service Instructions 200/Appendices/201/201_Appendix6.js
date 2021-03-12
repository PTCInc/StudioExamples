// $scope, $element, $attrs, $injector, $sce, $timeout, $http, $ionicPopup, and $ionicpopup services are available

//
// triggered when user clicks on object in the scene
$scope.$on('userpick', function (event, targetName, targetType, eventData) {

    //
    //Look at model and see if it has metadata. If it does, then execute the below code and create an object called metadata
    PTC.Metadata.fromId(targetName)
        .then((metadata) => {

            //
            // variable to pull the value for the occurrence property in the eventData JSON object from the model. Create variable for the currently selected part
            var pathId = JSON.parse(eventData).occurrence
            $scope.currentSelection = targetName + "-" + pathId

            //    
            // create variables based on attribute names from Creo Illustrate for this model. use metadata.get to obtain the data from the JSON properties for this occurrence.
            var partName = metadata.get(pathId, 'Display Name');
            var instructionName = metadata.get(pathId, 'illustration');
            var partNumber = metadata.get(pathId, 'partNumber');

            //
            // adds an ionic popup when a part is clicked. Show the part number and name of the selected object. &nbsp;</br> adds a line break between the two variables
            var popup = $ionicPopup.show({
                template: '<div>' + partNumber + '&nbsp;</br>' + partName + '</div>',
                scope: $scope
            }); //end of ionic popup

            // create a function to close the popup. 
            var closePopup = function (popup) {

                //
                // function for returning that the popup will be closed using the .close() method
                return function () {

                    //
                    //close the popup
                    popup.close()

                    //
                    //change the Text property of the playButton to the instructionName variable, which was created from the JSON data of the model
                    $scope.view.wdg.playButton.text = instructionName;

                    //
                    // create an object for the playButton called toPlay. This object will have properties of model, which will be the name of the object that 
                    //is clicked on and instruction, which will add the proper syntax for calling a sequence, based off the instructionName variable, into Studio
                    $scope.view.wdg.playButton.toPlay = {
                        model: targetName,
                        instruction: 'l-Creo 3D - ' + instructionName + '.pvi'
                    };

                } // return end

            } // closepopup function end

            //
            //call the $timeout service which will call the function for closing the popup after 3 seconds (3000 ms)
            $timeout(closePopup(popup), 3000);

        }) //end brackets for PTC API and .then

        // 
        //catch statement if the promise of having a part with metadata is not met
        .catch((err) => { console.log('metadata extraction failed with reason : ' + err) })

}) //end brackets for userpick function. Will continue to move throughout code

//
//create the playit function to bind a sequence for the model to the play button
$scope.playit = function () {

    //
    // if there is information in the created toPlay object to say that there is an illustration attribute for the part
    if ($scope.view.wdg.playButton.toPlay != undefined)

        //
        // set the sequence property for the quadcopter model to be equal to the value of the instruction property of the toPlay object
        $scope.view.wdg.quadcopter.sequence = $scope.view.wdg.playButton.toPlay.instruction;

} // playit function end

//
//sequenceloaded event listener triggers when the sequence property is updated
$scope.$on('sequenceloaded', function (event) {

    //
    // call a widget service to trigger the quadcopter model to play all steps for the given sequence
    twx.app.fn.triggerWidgetService('quadcopter', 'playAll');

}); //serviceloaded event function end

//
//resetit function
$scope.resetit = function () {

    //
    //set the sequence property of the quadcopter model to blank
    $scope.view.wdg.quadcopter.sequence = ''

} //resetit function end
