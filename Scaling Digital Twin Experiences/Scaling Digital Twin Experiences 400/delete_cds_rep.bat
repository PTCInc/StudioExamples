@ set uname=YOURUSERNAME
@ set passwd=YOURPASSWORD
@ set server=YOURSERVER
curl -k -u %uname%:%passwd% -H "X-Requested-With: XMLHttpRequest" -X DELETE %server%/ExperienceService/content/reps/%1 
