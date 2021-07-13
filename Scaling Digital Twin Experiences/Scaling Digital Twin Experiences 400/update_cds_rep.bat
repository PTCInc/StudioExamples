@ set uname=YOURUSERNAME
@ set passwd=YOURPASSWORD
@ set server=YOURSERVER
@ curl -u %uname%:%passwd% -H "X-Requested-With: XMLHttpRequest" -k -F "File=@%1" -H "Content-Type:multipart/form-data" -X PUT %server%/ExperienceService/content/reps/sdte400
