@rem putting the @ symbol in front of the line is used for suppression inside the command line
@rem define the reusable variables for the file
@rem @ set uname=
@rem @ set passwd=
@rem @ set server=

@rem set the numbers for your vumarks. You can either choose to use multiple vumarks for multiple experiences or just use one of them @rem for all the configurations. If you choose all the configurations on the same experience, delete vumark2 and vumark3 variables.
@rem @ set vumark1=
@rem @ set vumark2=
@rem @ set vumark3=

@rem map template to the experience. If your experience name is different from the one that was suggested in the tutorial
@rem you will need to edit the project name in this line
@ curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{ \"key\":\"urn:curriculum:template:202\", \"value\":\"projects/scalingdigitaltwinexperiences202/index.html?expId=1^&color=%%7B%%7Bcurriculum:color%%7D%%7D^&model=%%7B%%7Bcurriculum:model%%7D%%7D\", \"resourcetype\":\"Experience\",\"title\" : { \"en\":\"ScalingDigitalTwinExperiences202\" }, \"requires\" : [ \"AR-tracking\",\"w320dp\"  ], \"description\":{ \"en\":\"Curriculum demo\" } }" %server%/ExperienceService/id-resolution/mappings

@rem map configuration 1 with your choice of color
@ curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:1\", \"value\": \"urn:curriculum:color:purple\"}" %server%/ExperienceService/id-resolution/mappings

@rem map configuration 1 with your choice of model
@ curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:1\", \"value\": \"urn:curriculum:model:2\"}" %server%/ExperienceService/id-resolution/mappings

@rem map configuration 1 to the template
@ curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:1\", \"value\": \"urn:curriculum:template:202\"}" %server%/ExperienceService/id-resolution/mappings

@rem map ThingMark to configuration 1. You will need to change the name of the ThingMark to your own
@ curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:vuforia:vumark:%vumark1%\", \"value\": \"urn:curriculum:config:1\"}" %server%/ExperienceService/id-resolution/mappings

@rem map configuration 2 with your choice of color
@ curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:2\", \"value\": \"urn:curriculum:color:red\"}" %server%/ExperienceService/id-resolution/mappings

@rem map configuration 2 with your choice of model
@ curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:2\", \"value\": \"urn:curriculum:model:1\"}" %server%/ExperienceService/id-resolution/mappings

@rem map configuration 2 to the template
@ curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:2\", \"value\": \"urn:curriculum:template:202\"}" %server%/ExperienceService/id-resolution/mappings

@rem map ThingMark to configuration 2. You will need to change the name of the ThingMark to your own
@ curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:vuforia:vumark:%vumark2%\", \"value\": \"urn:curriculum:config:2\"}" %server%/ExperienceService/id-resolution/mappings

@rem map configuration 3 with your choice of color
@ curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:3\", \"value\": \"urn:curriculum:color:white\"}" %server%/ExperienceService/id-resolution/mappings

@rem map configuration 3 with your choice of model
@ curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:3\", \"value\": \"urn:curriculum:model:2\"}" %server%/ExperienceService/id-resolution/mappings

@rem map configuration 3 to the template
@ curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:3\", \"value\": \"urn:curriculum:template:202\"}" %server%/ExperienceService/id-resolution/mappings

@rem map ThingMark to configuration 3. You will need to change the name of the ThingMark to your own
@ curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:vuforia:vumark:%vumark3%\", \"value\": \"urn:curriculum:config:3\"}" %server%/ExperienceService/id-resolution/mappings