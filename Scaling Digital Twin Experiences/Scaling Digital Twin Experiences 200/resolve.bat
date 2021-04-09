@ set uname=YOURUSERNAME
@ set passwd=YOURPASSWORD
@ set server=YOURSERVER

@rem for tablet etc. experiences
@ curl -u %uname%:%passwd% -H "X-Requested-With: XMLHttpRequest" -k -H Accept:application/json %server%/ExperienceService/id-resolution/resolutions?key=%1 

@rem for hololens experiences 
@rem \installations\curl -u %uname%:%passwd% -H "X-Requested-With: XMLHttpRequest" -k -H Accept:application/json https://%server%/ExperienceService/id-resolution/resolutions?key=%1^&aspect=holographic^&aspect=AR-tracking^&aspect=spatial-tracking 

