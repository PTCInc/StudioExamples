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
            var priceString = metadata.get(pathId, 'listPrice');

            //
            //listPrice is obtained as a string. If there is a price for the part, then use parseFloat to turn the string into a float. If there is not a defined price, set price to ""
            var price = priceString != undefined ? '&nbsp;</br>$' + parseFloat(priceString) + '&nbsp;</div><div class="btnadd" ng-click="hiliteOff(); popup.close();addToCart();"> Add to Cart</div>'
                : "";

            //
            // set itemName app parameter to be equal to the partName variable, same relationship with itemNumber and partNumber and priceInfo and price. 
            // Set the itemCount to 1 for the purpose of this section, since it is not hooked up to an actual inventory.
            $scope.app.params.itemName = partName;
            $scope.app.params.itemNumber = partNumber;
            $scope.app.params.priceInfo = parseFloat(priceString);
            $scope.app.params.itemCount = 1;

            if (instructionName.length == 0) {

                //
                // adds an ionic popup when a part is clicked. Show the quantity, part number, name, and price of the selected object. &nbsp;</br> adds a line break between the two variables
                $scope.popup = $ionicPopup.show({

                    //
                    //template for the popup with added buttons
                    template: '<div>' + $scope.app.params.itemCount + 'x &nbsp;' + partNumber +
                        '&nbsp;</br>' + partName +
                        price +
                        '<div class="btncontinue" ng-click="hiliteOff();popup.close();">Continue</div>',

                    scope: $scope
                }); //end of ionic popup

            } else {

                //
                // adds an ionic popup when a part is clicked. Show the quantity, part number, name, and price of the selected object. &nbsp;</br> adds a line break between the two variables
                $scope.popup = $ionicPopup.show({

                    //
                    //template for the popup with added buttons
                    template: '<div>' + $scope.app.params.itemCount + 'x &nbsp;' + partNumber +
                        '&nbsp;</br>' + partName +
                        price +
                        '<div class="btndisassemble" ng-click="hiliteOff();popup.close();disassemble();">Disassemble</div>' +
                        '<div class="btncontinue" ng-click="hiliteOff();popup.close();">Continue</div>',

                    scope: $scope
                }); //end of ionic popup if there is a disassembly sequence associated with it

            } // end of if statement      

            //
            //highlight the chosen item and set the shader to true
            $scope.hilite([$scope.currentSelection], true);

            //
            //function for removing the highlight
            $scope.hiliteOff = function () {

                $scope.hilite([$scope.currentSelection], false)

            }; // end of hiliteOff function

            //
            // function to be bound to the Disassemble button in the popup
            $scope.disassemble = function () {

                //
                // set an object that targets the model and its instruction property
                var modelObject = {
                    model: targetName,
                    instruction: 'l-Creo 3D - ' + instructionName + '.pvi'
                };

                //
                // set the sequence for the quadcopter to be the name of the associated instruction
                $scope.view.wdg.quadcopter.sequence = modelObject.instruction

            } //disassemble function end

        }) //end brackets for PTC API and .then

        // 
        //catch statement if the promise of having a part with metadata is not met
        .catch((err) => { console.log('metadata extraction failed with reason : ' + err) })

}) //end brackets for userpick function. Will continue to move throughout code

//
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
                // set an empty array called identifiers. This array will house the parts that contain the entered part number
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

//
// highlighting function. Inputs are the selected part and a boolean for hilite
$scope.hilite = function (items, hilite) {

    //
    //iterate over each item that is used as an imported variable for the function using .forEach to look at each value that comes in the items input
    items.forEach(function (item) {

        //
        //set the properties of the TML 3D Renderer to highlight the selected item using a TML Text shader. "green" is the name of the script for the TML Text.
        tml3dRenderer.setProperties(item, hilite === true ? { shader: "green", hidden: false, opacity: 0.9, phantom: false, decal: true }
            : { shader: "Default", hidden: false, opacity: 1.0, phantom: false, decal: false });

    }) //foreach end

} //hilite function end

$scope.app.params.cartLabel = "Cart"; // set cartLabel app parameter to be "Cart". This will bind to the Text property for the labelCart label
$scope.cart = {}; // declare empty object called cart

//
// function for adding a selected part to the cart   
$scope.addToCart = function () {

    //
    // create variable called cartItem that is equal to the value of the currentSelection property of the cart object. 
    //If the selected part hasn't been added to the cart yet, then the cartItem variable will be undefined and populate the cartItem variable with the current 
    //information about the part so that cartItem becomes an object. If the selected part has already been added, then the count property of cartItem will increase by the item count
    var cartItem = $scope.cart[$scope.currentSelection];

    if (cartItem === undefined) {
        cartItem = {
            count: $scope.app.params.itemCount,
            itm: $scope.app.params.itemNumber,
            tag: $scope.app.params.itemName,
            prc: $scope.app.params.priceInfo
        }
    } else {
        cartItem.count += $scope.app.params.itemCount
    }

    $scope.cart[$scope.currentSelection] = cartItem;

    //
    //cartItemAmount initialized as 0. will be used to count how many items are in the cart
    var cartItemAmount = 0;

    //  
    // set an empty array for the cart. this array will have an object pushed into it 
    var cartContents = [];

    //  
    // initialize variable for keeping track of the price of the objects in the cart
    var cartPrice = 0;

    //
    //loop over each item that is added to the cart
    for (var itm in $scope.cart) {

        //
        //add a number to the counting variable for each item added
        cartItemAmount += $scope.cart[itm].count;

        //
        // add the price of each item to the total price of the cart
        cartPrice = cartPrice += $scope.cart[itm].count * $scope.cart[itm].prc

        //
        //push the name (tag), item count (count), and price (prc) of each part into the repeater for the cart
        cartContents.push({
            tag: $scope.cart[itm].tag,
            count: $scope.cart[itm].count,
            prc: $scope.cart[itm].prc
        }); // end of the push method for cartContents

    }// for loop end

    //
    // set the app parameter for cart to be equal to the cartContents array
    $scope.app.params.cart = cartContents;

    //
    //setting the cartLabel app parameter. if there are items to put into the cart (true), the text of the cart label should be cart(total cost of cart). If false, just keep the label text as cart
    $scope.app.params.cartLabel = cartItemAmount > 0 ? "Cart($" + cartPrice + ")"
        : "Cart";

} // end of addToCart function

//
// clear the cart. set the part app parameter and cart object to be empty. change the text on the cart label back to just Cart
$scope.clearCart = function () {

    $scope.app.params.cart = [];
    $scope.cart = {};
    $scope.app.params.cartLabel = "Cart";

} // end of clearCart function
