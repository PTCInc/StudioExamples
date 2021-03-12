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
