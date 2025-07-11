Introduction
This is an advanced example that shows how to mmap  number of instances of a product against the product definition
Using the IRS, we can map an instance ID - something we might scan for example, and link this to the product id /version
we can map other property values, e.g. in this example color and thingname, against the instance id

The experience uses the OCTO Identity Resolution widget to resolve the instance ID that is scanned, and will pass the 
various parameters into the experience. In these example, the models are setup with a 'pained' property on various surfaces that
will support the per-instance color. The result when scanning an instance is we see the shared product geometry model but with 
any special faces correctly colored to the instance.

the example also creates a unique Thing per instance (when the instances are recorded).  When the experience is running, that value is used to get a
property value (battery charge level) from Thingworx.
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

Secondly, import the droneEntities.twx into your Thingworx server.  This
provides a sample Thing service that is called from the commandline scripts
to create instances of the quadcopter/drones.

# To create an instance
First, run create_all to create your models. You might create a model of the
base quadcoper called QCbase and an advanced called QCadv.

using create_paint_instance, you can now create many 'instances' of these
base products.

create_paint_instance <instID> <color> <productID>

e.g.
create_paint_instance 101 red QCbase
create_paint_instance 102 green QCbase
create_paint_instance 103 blue QCbase
create_paint_instance 104 purple QCbase

create_paint_instance 201 yellow QCadv
create_paint_instance 202 cyan QCadv

Each instance has a 'drone' created in Thignworx, and this Thing simulates 
managing the battery charge and other IOT functions that a connected drone
might employ.  You can edit the values using Thingworx composer, and if you 
feel like having some real fun, connect the instances up to a raspberry pi or
some other edge device that can provide ral values into the drone thing.

# Viewing the instance
The experience provided willfirst scan a bar code that represents the instance
id - in the examples above we used 101, 102 etc. so you can create a barcode
using  online  tool that can  represent  these  values. You can also use other
values for the IDs.

Scan the instance code and the experience will find the product that is linked
to this,  load  that  product,  and then will  apply the given  'color' to the
model. The experience demosntrates how to use model metadata to identify which
parts of the models are 'paintable'. 

The result  should be amodel of the  quadcopter  with the  correctly  coloured
outer shell. The current  battery charge is displayed in a floating  indicator
above the model.
