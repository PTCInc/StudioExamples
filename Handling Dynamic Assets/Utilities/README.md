A list of (windows) commandline utilities that help in the creation/management of "products"

These were built to automate the creation of content that goes along with the
tutorial examples in this section e.g. the two Quadcopters.

# Setup
add the following to your ocmmand environment
set uname=<your ES username>
set passed=<your ES password>
set server=<your ES server address>

e.g.
set uname=cookie
set passwd=monster
set server=https://cookies.com

# To create a "product" 
Run 

```create_all <productid> <version> <pvzfile>```

This will 
1. create the product wrapper using the id/version
2. create a model using the pvz
3. create a model target from the model

you can also create all the pieces separately using create_product, 
create_model, create_target.  check_model will validate that model processing 
is complete (required before a target can be created)

Inside create_product you will see the metadata that was used for these 
examples - you can adapt this to fit your own products. Same with create_model
and create_target.  

In this example, the target created is a "standard" model target. Refer to 
the API documentation if you want to adapt this to create an advanced model
target.

# Others
Other utilities are provided to manage the products e.g. list them, delete them etc.
run the script, no parameters, to get information.
