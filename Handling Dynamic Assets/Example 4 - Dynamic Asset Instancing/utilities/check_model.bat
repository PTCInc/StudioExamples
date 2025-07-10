@if "%uname%"=="" goto error1
@if "%passwd%"=="" goto error1
@if "%server%"=="" goto error1

@rem did the user provide a parameter? - use it
@if "%~1"=="" goto tryp2
@set modelId=%~1
@goto start

@rem if  not, do we have a session ongoing (file __p2 contains the id)
:tryp2
@for /f "tokens=1,2 delims=,:{} " %%a in (__p2) do @set %%~a=%%~b
@if /I "%modelId%" EQU "" goto error2

:start
@echo checking status of modelId = %modelId%
@rem first of all, lets check the model has finished processing

:wait
@if EXIST __p3 @del __p3
@rem assume failure, and let the status check change this
@set simplifiedStatus=Failed
@curl -u %uname%:%passwd% -H "X-Requested-With: XMLHttpRequest" -s -k %server%/ExperienceService/products/v1/model/status/%modelId% --output __p3
@for /f "tokens=1,2 delims=,:{} " %%a in (__p3) do @set %%~a=%%~b
@echo checking simplified status = %simplifiedStatus%
@if /I %simplifiedStatus% EQU InProgress goto wait
@if /I %simplifiedStatus% EQU Failed goto abort
@echo model creation status = %simplifiedStatus%
@goto done

:abort
@echo model probably failed to convert
@echo:
@set ERRORLEVEL=1
goto done

:error1
@echo remember to set uname, passwd and server environment variables
@echo:
:error2
@echo usage : create_target ^<modelid^>
@echo:
@echo    e.g. create_target 76987896450123664688
@set ERRORLEVEL=1
:done
