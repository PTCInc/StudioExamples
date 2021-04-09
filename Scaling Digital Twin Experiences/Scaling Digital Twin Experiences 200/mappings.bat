@set uname=YOURUSERNAME
@set passwd=YOURPASSWORD
@set server=YOURSERVER

@ curl -u %uname%:%passwd% -k %server%/ExperienceService/id-resolution/mappings/%1
