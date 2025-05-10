@rem putting the @ symbol in front of the line is used for suppression inside the command line
@rem define the reusable variables for the file
@rem @ set uname=
@rem @ set passwd=
@rem @ set server=

@rem set the numbers for your vumarks. You can either choose to use multiple vumarks for multiple experiences or just use one of them @rem for all the configurations. If you choose all the configurations on the same experience, delete vumark2 and vumark3 variables.
set bar9=000000050883
set bar10=000000040266

@rem demo 404

@rem map thingmark7 to config9
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:vuforia:vumark:%bar9%\", \"value\": \"urn:curriculum:config:9\"}" %server%/ExperienceService/id-resolution/mappings
@rem map config to params
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:9\", \"value\": \"/ExperienceService/content/reps/sdte400/targets/quadcopterDT1adv/guideview.png\", \"resourcetype\":\"guide\" }" %server%/ExperienceService/id-resolution/mappings
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:9\", \"value\": \"vuforia-model:////ExperienceService/content/reps/sdte400/targets/quadcopterDT1adv/target\", \"resourcetype\":\"target\" }" %server%/ExperienceService/id-resolution/mappings
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:9\", \"value\": \"/ExperienceService/content/reps/sdte400/models/QuadcopterDT1.pvz\", \"resourcetype\":\"model\" }" %server%/ExperienceService/id-resolution/mappings

@rem map thingmark8 to config10
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:vuforia:vumark:%bar10%\", \"value\": \"urn:curriculum:config:10\"}" %server%/ExperienceService/id-resolution/mappings
@rem map config to params
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:10\", \"value\": \"/ExperienceService/content/reps/sdte400/targets/quadcopterDT2adv/guideview.png\", \"resourcetype\":\"guide\" }" %server%/ExperienceService/id-resolution/mappings
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:10\", \"value\": \"vuforia-model:////ExperienceService/content/reps/sdte400/targets/quadcopterDT2adv/target\", \"resourcetype\":\"target\" }" %server%/ExperienceService/id-resolution/mappings
@curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:10\", \"value\": \"/ExperienceService/content/reps/sdte400/models/QuadcopterDT2.pvz\", \"resourcetype\":\"model\" }" %server%/ExperienceService/id-resolution/mappings

set bar12=000000040259
