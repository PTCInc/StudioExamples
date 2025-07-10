@if "%uname%"=="" goto error1
@if "%passwd%"=="" goto error1
@if "%server%"=="" goto error1

@if "%1"=="" goto all
@if "%2"=="" goto product
goto version

:all
@curl -u %uname%:%passwd% -H "X-Requested-With: XMLHttpRequest" -k -H Accept:application/json %server%/ExperienceService/id-resolution/resolutions?key=urn:vuforia:product
@goto done
:product
@curl -u %uname%:%passwd% -H "X-Requested-With: XMLHttpRequest" -k -H Accept:application/json %server%/ExperienceService/id-resolution/resolutions?key=urn:vuforia:product:%1
@goto done
:version
@curl -u %uname%:%passwd% -H "X-Requested-With: XMLHttpRequest" -k -H Accept:application/json %server%/ExperienceService/id-resolution/resolutions?key=urn:vuforia:product:%1:%2
@goto done

:error1
@echo remember to set uname, passwd and server environment variables
@echo:
:error2
@echo usage : list_product [^<product id^> [^<version^>]]
@echo:
@echo    e.g. list_product 
@echo    e.g. list_product 1234
@echo    e.g. list_product 1234 v4
:done
