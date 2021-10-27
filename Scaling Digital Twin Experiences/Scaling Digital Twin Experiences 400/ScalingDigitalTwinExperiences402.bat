@rem putting the @ symbol in front of the line is used for suppression inside the command line
@rem define the reusable variables for the file
@rem @ set uname=
@rem @ set passwd=
@rem @ set server=

@rem set the numbers for your vumarks. You can either choose to use multiple vumarks for multiple experiences or just use one of them @rem for all the configurations. If you choose all the configurations on the same experience, delete vumark2 and vumark3 variables.
@rem set vumark5=
@rem set vumark6=


@rem map thingmark5 to config5
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:vuforia:vumark:%vumark5%\", \"value\": \"urn:curriculum:config:5\"}" %server%/ExperienceService/id-resolution/mappings
@rem map config to params
@rem the config here will list the model, the color, the guideview and the image target
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:5\", \"value\": \"urn:curriculum:color:yellow\"}" %server%/ExperienceService/id-resolution/mappings
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:5\", \"value\": \"urn:curriculum:guide:quadDT1/guideDT1.png\"}" %server%/ExperienceService/id-resolution/mappings
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:5\", \"value\": \"urn:curriculum:target:quadDT1/quadDT1?id=\"}" %server%/ExperienceService/id-resolution/mappings
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:5\", \"value\": \"urn:curriculum:model:QuadcopterDT1.pvz\"}" %server%/ExperienceService/id-resolution/mappings
@rem map config to template
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:5\", \"value\": \"urn:curriculum:template:402\"}" %server%/ExperienceService/id-resolution/mappings

@rem map thingmark6 to config6
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:vuforia:vumark:%vumark6%\", \"value\": \"urn:curriculum:config:6\"}" %server%/ExperienceService/id-resolution/mappings
@rem map config to params
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:6\", \"value\": \"urn:curriculum:color:cyan\"}" %server%/ExperienceService/id-resolution/mappings
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:6\", \"value\": \"urn:curriculum:guide:quadDT2/guideDT2.png\"}" %server%/ExperienceService/id-resolution/mappings
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:6\", \"value\": \"urn:curriculum:target:quadDT2/quadDT2?id=\"}" %server%/ExperienceService/id-resolution/mappings
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:6\", \"value\": \"urn:curriculum:model:QuadcopterDT2.pvz\"}" %server%/ExperienceService/id-resolution/mappings
@rem map config to template
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:6\", \"value\": \"urn:curriculum:template:402\"}" %server%/ExperienceService/id-resolution/mappings

@rem map template to the experience. If your experience name is different from the one that was suggested in the tutorial
@rem you will need to edit the project name in this line
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{ \"key\":\"urn:curriculum:template:402\", \"value\":\"projects/scalingdigitaltwinexperiences402/index.html?expId=1^&target=^%7B^%7Bcurriculum:target^%7D^%7D^&model=^%7B^%7Bcurriculum:model^%7D^%7D^&vumark=^%7B^%7Bvuforia:vumark^%7D^%7D^&guide=^%7B^%7Bcurriculum:guide^%7D^%7D^&color=^%7B^%7Bcurriculum:color^%7D^%7D\", \"resourcetype\":\"Experience\",\"title\" : { \"en\":\"ScalingDigitalTwinExperiences402\" }, \"requires\" : [ \"AR-tracking\",\"w320dp\"  ], \"description\":{ \"en\":\"Curriculum demo 402\" } }" %server%/ExperienceService/id-resolution/mappings

@rem advanced - use barcodes instead of thingmarks
@rem @curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:epc:id:sgtin:0000000.004025\", \"value\": \"urn:curriculum:config:5\"}" %server%/ExperienceService/id-resolution/mappings
@rem @curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:epc:id:sgtin:0000000.004026\", \"value\": \"urn:curriculum:config:5\"}" %server%/ExperienceService/id-resolution/mappings
