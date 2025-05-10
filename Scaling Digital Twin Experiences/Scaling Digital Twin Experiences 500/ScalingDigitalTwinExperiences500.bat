@rem putting the @ symbol in front of the line is used for suppression inside the command line
@rem define the reusable variables for the file
@rem @ set uname=
@rem @ set passwd=
@rem @ set server=

@rem set the numbers for your vumarks. You can either choose to use multiple vumarks for multiple experiences or just use one of them @rem for all the configurations. If you choose all the configurations on the same experience, delete vumark2 and vumark3 variables.



@rem sparepart box
@rem map barcode to config501
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:epc:id:sgtin:0000000.044567\", \"value\": \"urn:curriculum:config:501\"}" %server%/ExperienceService/id-resolution/mappings
@rem map config to params
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:501\", \"value\": \"urn:curriculum:guide:/ExperienceService/content/reps/sdte400/targets/quadDT1/guideDT1.png\", \"resourcetype\":\"Guide\"}" %server%/ExperienceService/id-resolution/mappings
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:501\", \"value\": \"urn:curriculum:target:vuforia-image:////ExperienceService/content/reps/sdte400/targets/quadDT1/quadDT1\", \"resourcetype\":\"Target\"}" %server%/ExperienceService/id-resolution/mappings
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:501\", \"value\": \"urn:curriculum:model:/ExperienceService/content/reps/sdte400/models/QuadcopterDT1.pvz\", \"resourcetype\":\"Model\"}" %server%/ExperienceService/id-resolution/mappings
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:501\", \"value\": \"urn:curriculum:locate:battery_2468\"}" %server%/ExperienceService/id-resolution/mappings
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:501\", \"value\": \"urn:curriculum:searchkey:partNumber\"}" %server%/ExperienceService/id-resolution/mappings
@rem map config to template
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:501\", \"value\": \"urn:curriculum:template:500\"}" %server%/ExperienceService/id-resolution/mappings
@rem map template to experience
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{ \"key\":\"urn:curriculum:template:500\", \"value\":\"projects/scalablepartlocator/index.html?expId=1^&target=^%7B^%7Bcurriculum:target^%7D^%7D^&model=^%7B^%7Bcurriculum:model^%7D^%7D^&locate=^%7B^%7Bcurriculum:locate%7D^%7D^&guide=^%7B^%7Bcurriculum:guide^%7D^%7D^&searchkey=^%7B^%7Bcurriculum:searchkey^%7D^%7D\", \"resourcetype\":\"Experience\",\"title\" : { \"en\":\"ScalablePartLocator\" }, \"requires\" : [ \"AR-tracking\",\"w320dp\"  ], \"description\":{ \"en\":\"Part locator demo\" } }" %server%/ExperienceService/id-resolution/mappings
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:epc:id:sgtin:0000000.044567\", \"value\": \"/ExperienceService/content/reps/sdte400/images/imgDT1.jpg\", \"resourcetype\":\"thumbnail\"}" %server%/ExperienceService/id-resolution/mappings


@rem map barcode to config502
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:epc:id:sgtin:0000000.045333\", \"value\": \"urn:curriculum:config:502\"}" %server%/ExperienceService/id-resolution/mappings
@rem map config to params
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:502\", \"value\": \"urn:curriculum:guide:/ExperienceService/content/reps/sdte400/targets/quadDT2/guideDT2.png\", \"resourcetype\":\"Guide\"}" %server%/ExperienceService/id-resolution/mappings
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:502\", \"value\": \"urn:curriculum:target:vuforia-image:////ExperienceService/content/reps/sdte400/targets/quadDT2/quadDT2\", \"resourcetype\":\"Target\"}" %server%/ExperienceService/id-resolution/mappings
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:502\", \"value\": \"urn:curriculum:model:/ExperienceService/content/reps/sdte400/models/QuadcopterDT2.pvz\", \"resourcetype\":\"Model\"}" %server%/ExperienceService/id-resolution/mappings
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:502\", \"value\": \"urn:curriculum:locate:/0/17/2,/0/17/4\"}" %server%/ExperienceService/id-resolution/mappings
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:502\", \"value\": \"urn:curriculum:searchkey:Part ID Path\"}" %server%/ExperienceService/id-resolution/mappings
@rem map config to template
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:502\", \"value\": \"urn:curriculum:template:500\"}" %server%/ExperienceService/id-resolution/mappings


@rem map barcode to config503
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:epc:id:sgtin:0000000.045222\", \"value\": \"urn:curriculum:config:503\"}" %server%/ExperienceService/id-resolution/mappings
@rem map config to params
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:503\", \"value\": \"urn:curriculum:guide:/ExperienceService/content/reps/sdte400/targets/chopperDT3/guideD3.png\", \"resourcetype\":\"Guide\"}" %server%/ExperienceService/id-resolution/mappings
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:503\", \"value\": \"urn:curriculum:target:vuforia-image:////ExperienceService/content/reps/sdte400/targets/chopperDT3/chopperDT\", \"resourcetype\":\"Target\"}" %server%/ExperienceService/id-resolution/mappings
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:503\", \"value\": \"urn:curriculum:model:/ExperienceService/content/reps/sdte400/models/chopperDT3.pvz\", \"resourcetype\":\"Model\"}" %server%/ExperienceService/id-resolution/mappings
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:503\", \"value\": \"urn:curriculum:locate:rotor:/ExperienceService/content/reps/sdte400/partslists/ChopperDT3_partslists.json\"}" %server%/ExperienceService/id-resolution/mappings
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:503\", \"value\": \"urn:curriculum:searchkey:Part ID Path\"}" %server%/ExperienceService/id-resolution/mappings
@rem map config to template
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:503\", \"value\": \"urn:curriculum:template:500\"}" %server%/ExperienceService/id-resolution/mappings



