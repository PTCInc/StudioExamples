// $scope, $element, $attrs, $injector, $sce, $timeout, $http, $ionicPopup, and $ionicpopup services are available

$scope.$on('userpick', function (event, targetName, targetType, eventData) {
    //
    //Look at model and see if it has metadata. If it does, then execute the below code and create an object called metadata
    PTC.Metadata.fromId(targetName)
        .then((metadata) => {
            //
            // variable to pull the value for the occurrence property in the eventData JSON object from the model
            var pathId = JSON.parse(eventData).occurrence
            $scope.currentSelection = targetName + "-" + pathId
            // create variables based on attribute names from Creo Illustrate for this model. use metadata.get to obtain the data from the JSON properties for this occurrence.
            var partName = metadata.get(pathId, 'Display Name');
            var instructionName = metadata.get(pathId, 'illustration');
            var partNumber = metadata.get(pathId, 'partNumber');
            var priceString = metadata.get(pathId, 'listPrice');

            //listPrice is obtained as a string. to change the string into an float, use parseFloat
            var price = priceString != undefined ? '$' + parseFloat(priceString) : "";

            /* set itemName app parameter to be equal to the partName variable, same relationship with itemNumber and partNumber and priceInfo and price. Set the itemCount to 1 for the purpose of this section, since it is not hooked up to an 		actual inventory*/
            $scope.app.params.itemName = partName;
            $scope.app.params.itemNumber = partNumber;
            $scope.app.params.priceInfo = parseFloat(priceString);
            $scope.app.params.itemCount = 1;

            if (instructionName.length == 0) {
                // adds an ionic popup when a part is clicked. Show the part number, name, price, and quantity of the selected object. &nbsp;</br> adds a line break between the two variables
                $scope.popup = $ionicPopup.show({
                    //
                    //template for the popup with added buttons
                    template: '<div>' + $scope.app.params.itemCount + 'x &nbsp;' + partNumber + '&nbsp;</br>' + partName + '&nbsp;</br> ' + price +
                        '&nbsp;</div><div ng-click="">Add to Cart</div>' + '<div ng-click="">Continue</div>',
                    //
                    // set the scope for the popup
                    scope: $scope

                }); //end of ionic popup if there is no disassembly sequence

            } else {

                $scope.popup = $ionicPopup.show({
                    //
                    //template for the popup with added buttons
                    template: '<div>' + $scope.app.params.itemCount + 'x &nbsp;' + partNumber + '&nbsp;</br>' + partName + '&nbsp;</br> ' + price +
                        '&nbsp;</div><div ng-click="">Add to Cart</div>' + '<div ng-click="">Disassemble</div>' + '<div ng-click="">Continue</div>',
                    //
                    // set the scope for the popup
                    scope: $scope

                }); //end of ionic popup if there is a disassembly sequence
            } // end of if else statement

            //highlight the chosen item and set the shader to true
            $scope.hilite([$scope.currentSelection], true);

        }) //end brackets for PTC API and .then 
        //
        //catch statement if the promise of having a part with metadata is not met
        .catch((err) => { console.log('metadata extraction failed with reason : ' + err) })

}) //end brackets for userpick function. Will continue to move throughout code

//function for using the userInput text box to search for parts
$scope.findMeta = function () {
    //
    //set a variable for comparing the user input to the value of the partno application parameter
    var searchNum = $scope.app.params.partno;

    //
    // instead of using metadata from just the picked part, use metadata from the whole model. If resolved, proceed
    PTC.Metadata.fromId('quadcopter')
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

//sequenceloaded event listener triggers when the sequence property is updated
$scope.$on('sequenceloaded', function (event) {
    //
    // call a widget service to trigger the quadcopter model to play all steps for the given sequence
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
            : { shader: "Default", hidden: false, opacity: 1.0, phantom: false, decal: false });
    }) //foreach function end
} //hilite function end
