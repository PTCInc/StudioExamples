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