@if "%uname%"=="" goto error1
@if "%passwd%"=="" goto error1
@if "%server%"=="" goto error1

@if "%1"=="" goto error2

@rem call resolve urn:vuforia:product:%1
@curl -u %uname%:%passwd% -H "X-Requested-With: XMLHttpRequest" -k %server%/ExperienceService/products/v1/product/%1?get_all_resource=true 
@set ERRORLEVEL=0
@goto done

:error1
@echo remember to set uname, passwd and server environment variables
@echo:
:error2
@echo usage : get_product ^<pxvid^> 
@echo:
@echo    e.g. get_product 1002876863578236549 
@set ERRORLEVEL=1
:done
