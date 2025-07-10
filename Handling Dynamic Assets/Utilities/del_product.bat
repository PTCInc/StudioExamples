@if "%uname%"=="" goto error1
@if "%passwd%"=="" goto error1
@if "%server%"=="" goto error1

@if "%1"=="" goto error2

@curl -u %uname%:%passwd% -H "X-Requested-With: XMLHttpRequest" -X DELETE  -k %server%/ExperienceService/products/v1/product/%1 
@goto done

:error1
@echo remember to set uname, passwd and server environment variables
@echo:
:error2
@echo usage : del_product ^<pxvid^>
@echo:
@echo    e.g. del_product 76987896450123664688
:done
