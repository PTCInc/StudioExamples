@rem putting the @ symbol in front of the line is used for suppression inside the command line
@rem define the reusable variables for the file
@rem @ set uname=
@rem @ set passwd=
@rem @ set server=

@rem set the numbers for your vumarks. You can either choose to use multiple vumarks for multiple experiences or just use one of them @rem for all the configurations. If you choose all the configurations on the same experience, delete vumark2 and vumark3 variables.
@rem set vumark7=
@rem set vumark8=

@rem demo 403

@rem map thingmark7 to config7
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:vuforia:vumark:%vumark7%\", \"value\": \"urn:curriculum:config:7\"}" %server%/ExperienceService/id-resolution/mappings
@rem map config to params
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:7\", \"value\": \"urn:curriculum:guide:/ExperienceService/content/reps/sdte400/targets/quadDT1/guideDT1.png\"}" %server%/ExperienceService/id-resolution/mappings
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:7\", \"value\": \"urn:curriculum:target:vuforia-image:////ExperienceService/content/reps/sdte400/targets/quadDT1/quadDT1\"}" %server%/ExperienceService/id-resolution/mappings
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:7\", \"value\": \"urn:curriculum:thing:drone1\"}" %server%/ExperienceService/id-resolution/mappings
@rem map config to template
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:7\", \"value\": \"urn:curriculum:template:403\"}" %server%/ExperienceService/id-resolution/mappings

@rem map thingmark8 to config8
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:vuforia:vumark:%vumark8%\", \"value\": \"urn:curriculum:config:8\"}" %server%/ExperienceService/id-resolution/mappings
@rem map config to params
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:8\", \"value\": \"urn:curriculum:guide:/ExperienceService/content/reps/sdte400/targets/quadDT2/guideDT2.png\"}" %server%/ExperienceService/id-resolution/mappings
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:8\", \"value\": \"urn:curriculum:target:vuforia-image:////ExperienceService/content/reps/sdte400/targets/quadDT2/quadDT2?id=\"}" %server%/ExperienceService/id-resolution/mappings
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:8\", \"value\": \"urn:curriculum:thing:drone2\"}" %server%/ExperienceService/id-resolution/mappings
@rem map config to template
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:8\", \"value\": \"urn:curriculum:template:403\"}" %server%/ExperienceService/id-resolution/mappings

@rem and map the template to the experience
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{ \"key\":\"urn:curriculum:template:403\",\"value\":\"projects/scalingdigitaltwinexperiences403/index.html?expId=1^&target=^%7B^%7Bcurriculum:target^%7D^%7D^&model=^%7B^%7Bcurriculum:model^%7D^%7D^&vumark=^%7B^%7Bvuforia:vumark^%7D^%7D^&guide=^%7B^%7Bcurriculum:guide^%7D^%7D^%7D^%7D^&thing=^%7B^%7Bcurriculum:thing^%7D^%7D\", \"resourcetype\":\"Experience\",\"title\" : { \"en\":\"Curriculum 403\" }, \"requires\" : [ \"AR-tracking\",\"w320dp\"  ], \"description\":{ \"en\":\"Curriculum 403\" } }" %server%/ExperienceService/id-resolution/mappings

@rem our experience works by first scanning the target, retrieving the ID from the target, and then making a second call to the IRS to identify the content
@rem that is associated to this target ID. That lookup is performed by creating a urn (urn:curriculum:targetid:%targetID%) and supplying this as the key 
@rem here we map the various keys to content
@rem because out content is external, we provide both the 3d model shape (pvz) and the associated metadata (json) - the latter is used to 'paint' the color onto the former

@rem target imgDT1 maps to a yellow quadcopterDT1 
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:targetid:imgDT1\", \"value\": \"yellow\", \"resourcetype\":\"color\"}" %server%/ExperienceService/id-resolution/mappings
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:targetid:imgDT1\", \"value\": \"/ExperienceService/content/reps/sdte400/models/QuadcopterDT1.pvz\", \"resourcetype\":\"model\" }" %server%/ExperienceService/id-resolution/mappings

@rem target imgDT1 maps to a cyan quadcopterDT2 
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:targetid:imgDT2\", \"value\": \"cyan\", \"resourcetype\":\"color\"}" %server%/ExperienceService/id-resolution/mappings
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:targetid:imgDT2\", \"value\": \"/ExperienceService/content/reps/sdte400/models/QuadcopterDT2.pvz\", \"resourcetype\":\"model\" }" %server%/ExperienceService/id-resolution/mappings

