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

Copy these utilities to the same folder as the create_product etc. command utilities.

Secondly, import the DesignShareEntities.twx into your Thingworx server.  This
provides a sample Thing service that is called from the commandline scripts
to create Sharing instances that capture comments.


# To create and share a "product" 
Run 

```create_and share <productid> <version> <pvzfile>```

This will 
1. create the product wrapper using the id/version
2. create a model using the pvz
3. generate a sharable link - a qrcode - that can be passed to
amother user for them to view your model. 

you can also create all the pieces separately using create_product, 
create_model, share_model.  

Inside create_product you will see the metadata that was used for these 
examples - you can adapt this to fit your own products. 
Same with create_model.  

share_product will create a QR code that will launch the experience with
a parameter - the product ID - that will connect the experience to a Thing
that is creted in Thingworx. This Thing is used to collect comments that can
be added from the example experience.  The example was created to demonstrate
how one might create a simple experience that would allow a designer to share
their work with a number of stakeholders who could view the content remotely and add comments.

