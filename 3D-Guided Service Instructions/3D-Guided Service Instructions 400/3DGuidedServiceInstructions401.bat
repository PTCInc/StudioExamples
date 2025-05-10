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
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:7\", \"value\": \"urn:curriculum:target:vuforia-image:////ExperienceService/content/reps/sdte400/targets/quadDT1/quadDT1?id=\"}" %server%/ExperienceService/id-resolution/mappings
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:7\", \"value\": \"urn:curriculum:thing:drone1\"}" %server%/ExperienceService/id-resolution/mappings
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:7\", \"value\": \"urn:curriculum:model:sdte400/models/QuadcopterDT1.pvz\"}" %server%/ExperienceService/id-resolution/mappings
@rem map config to template
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:7\", \"value\": \"urn:curriculum:template:404\"}" %server%/ExperienceService/id-resolution/mappings

@rem map thingmark8 to config8
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:vuforia:vumark:%vumark8%\", \"value\": \"urn:curriculum:config:8\"}" %server%/ExperienceService/id-resolution/mappings
@rem map config to params
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:8\", \"value\": \"urn:curriculum:guide:/ExperienceService/content/reps/sdte400/targets/quadDT2/guideDT2.png\"}" %server%/ExperienceService/id-resolution/mappings
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:8\", \"value\": \"urn:curriculum:target:vuforia-image:////ExperienceService/content/reps/sdte400/targets/quadDT2/quadDT2?id=\"}" %server%/ExperienceService/id-resolution/mappings
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:8\", \"value\": \"urn:curriculum:thing:drone2\"}" %server%/ExperienceService/id-resolution/mappings
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:8\", \"value\": \"urn:curriculum:model:sdte400/models/QuadcopterDT2.pvz\"}" %server%/ExperienceService/id-resolution/mappings
@rem map config to template
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:8\", \"value\": \"urn:curriculum:template:404\"}" %server%/ExperienceService/id-resolution/mappings

@rem and map the template to the experience
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{ \"key\":\"urn:curriculum:template:404\",\"value\":\"projects/3d-guided%20service%20instructions%20401/index.html?expId=1^&target=^%7B^%7Bcurriculum:target^%7D^%7D^&model=^%7B^%7Bcurriculum:model^%7D^%7D^&vumark=^%7B^%7Bvuforia:vumark^%7D^%7D^&guide=^%7B^%7Bcurriculum:guide^%7D^%7D^%7D^%7D^&thing=^%7B^%7Bcurriculum:thing^%7D^%7D\", \"resourcetype\":\"Experience\",\"title\" : { \"en\":\"3D Guided 401\" }, \"requires\" : [ \"AR-tracking\",\"w320dp\"  ], \"description\":{ \"en\":\"3D Guided Service Instructions 401\" } }" %server%/ExperienceService/id-resolution/mappings


@rem 
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:epc:id:sgtin:0000000.004027\", \"value\": \"qc-top-1112\", \"resourcetype\":\"partNumber\"}" %server%/ExperienceService/id-resolution/mappings
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:epc:id:sgtin:0000000.004027\", \"value\": \"red\", \"resourcetype\":\"color\"}" %server%/ExperienceService/id-resolution/mappings
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:epc:id:sgtin:0000000.004027\", \"value\": \"qc-top-1111\", \"resourcetype\":\"basePart\"}" %server%/ExperienceService/id-resolution/mappings

@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:epc:id:sgtin:0000000.004028\", \"value\": \"qc-top-1113\", \"resourcetype\":\"partNumber\"}" %server%/ExperienceService/id-resolution/mappings
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:epc:id:sgtin:0000000.004028\", \"value\": \"yellow\", \"resourcetype\":\"color\"}" %server%/ExperienceService/id-resolution/mappings
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:epc:id:sgtin:0000000.004028\", \"value\": \"qc-top-1111\", \"resourcetype\":\"basePart\"}" %server%/ExperienceService/id-resolution/mappings
