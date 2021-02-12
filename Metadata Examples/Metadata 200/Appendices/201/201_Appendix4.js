//
// triggered when user clicks on object in the scene
$scope.$on('userpick', function (event, targetName, targetType, eventData) {

    //
    // variable to pull the value for the occurrence property in the eventData JSON object from the model. Create variable for the currently selected part
    var pathId = JSON.parse(eventData).occurrence
    $scope.currentSelection = targetName + "-" + pathId

    //
    // adds an ionic popup when a part is clicked. Show the pathId of the selected object
    var popup = $ionicPopup.show({
        template: '<div>' + pathId + '</div>',
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

}) //end brackets for userpick function. Will continue to move throughout code

