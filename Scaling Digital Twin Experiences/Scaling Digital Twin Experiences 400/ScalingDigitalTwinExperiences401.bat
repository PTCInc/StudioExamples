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
@ curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{ \"key\":\"urn:curriculum:template:401\", \"value\":\"projects/scalingdigitaltwinexperiences401/index.html?expId=1^&color=%%7B%%7Bcurriculum:color%%7D%%7D^&model=%%7B%%7Bcurriculum:model%%7D%%7D\", \"resourcetype\":\"Experience\",\"title\" : { \"en\":\"ScalingDigitalTwinExperiences202\" }, \"requires\" : [ \"AR-tracking\",\"w320dp\"  ], \"description\":{ \"en\":\"Curriculum demo\" } }" %server%/ExperienceService/id-resolution/mappings

@rem map configuration 1 to the template
@ curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:1\", \"value\": \"urn:curriculum:template:401\"}" %server%/ExperienceService/id-resolution/mappings

@rem map configuration 2 to the template
@ curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:2\", \"value\": \"urn:curriculum:template:401\"}" %server%/ExperienceService/id-resolution/mappings

@rem map configuration 3 to the template
@ curl -u %uname%:%passwd% -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -k -d "{\"key\": \"urn:curriculum:config:3\", \"value\": \"urn:curriculum:template:401\"}" %server%/ExperienceService/id-resolution/mappings

