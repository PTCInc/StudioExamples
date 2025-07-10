@if "%uname%"=="" goto error1
@if "%passwd%"=="" goto error1
@if "%server%"=="" goto error1

@if "%~1"=="" goto error2
@set modelFile=%~f1
@if "%~2"=="" goto tryp1
@set pXvId=%~2
@goto  start

:tryp1
@rem if  not, do we have a session ongoing (file __p2 contains the id)
:tryp2
@for /f "tokens=1,2 delims=,:{} " %%a in (__p1) do @set %%~a=%%~b
@if /I "%pXvId%" EQU "" goto error2

:start
@rem cleanup any previous temp data
@if EXIST __p2 @del __p2
@echo creating model %modelFile% for pxvid %pXvId%
::
@curl -u %uname%:%passwd% -H "X-Requested-With: XMLHttpRequest" -H "name: chopper" -H "pXvId: %pXvId%" -H "content-type: application/pvz" ^
-H "X-Requested-With:any"  -H "cadDataExtension:pvz" -H "simplification:false" --data-binary "@%modelFile%" ^
-k %server%/ExperienceService/products/v1/model %verbose% --output __p2
::
@for /f "delims=:{} tokens=2" %%a in (__p2) do @echo created modelid=%%a
@set ERRORLEVEL=0
@goto done

:error1
@echo remember to set uname, passwd and server environment variables
@echo:
:error2
@echo usage : create_model ^<modelfile (.pvz)^> ^<pxvid^> 
@echo:
@echo    e.g. create_model quad1.pvz 012366-4688769-8789645 
@set ERRORLEVEL=1
:done

