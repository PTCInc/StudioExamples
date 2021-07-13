@rem putting the @ symbol in front of the line is used for suppression inside the command line
@rem define the reusable variables for the file
@rem @ set uname=
@rem @ set passwd=
@rem @ set server=

@rem set the numbers for your vumarks. You can either choose to use multiple vumarks for multiple experiences or just use one of them @rem for all the configurations. If you choose all the configurations on the same experience, delete vumark2 and vumark3 variables.
@rem @ set vumark1=
@rem @ set vumark2=
@rem @ set vumark3=

@rem map the new template to the experience
@ curl -u %uname%:%passwd% -k -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{ \"key\":\"urn:curriculum:template:202\", \"value\":\"projects/scalingdigitaltwinexperiences202/index.html?expId=1^&color=^%7B^%7Bcurriculum:color%%7D%%7D^&model=%%7B%%7Bcurriculum:model%%7D%%7D^&thing=%%7B%%7Bcurriculum:thing%%7D%%7D\", \"resourcetype\":\"Experience\",\"title\" : { \"en\":\"ScalingDigitalTwinExperiences202\" }, \"requires\" : [ \"AR-tracking\",\"w320dp\"  ], \"description\":{ \"en\":\"Curriculum demo\" } }" %server%/ExperienceService/id-resolution/mappings

@rem map the Things to their corresponding configurations
@ curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:1\", \"value\": \"urn:curriculum:thing:Quadcopter1\"}" %server%/ExperienceService/id-resolution/mappings

@ curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:2\", \"value\": \"urn:curriculum:thing:Quadcopter2\"}" %server%/ExperienceService/id-resolution/mappings

@ curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:3\", \"value\": \"urn:curriculum:thing:Quadcopter3\"}" %server%/ExperienceService/id-resolution/mappings
