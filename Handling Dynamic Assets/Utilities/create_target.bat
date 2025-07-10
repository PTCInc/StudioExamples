@if "%uname%"=="" goto error1
@if "%passwd%"=="" goto error1
@if "%server%"=="" goto error1

@set modelId=
@rem did the user provide a parameter? - use it
@if "%~1"=="" goto tryp2
@set modelId=%~1
@goto start

@rem if  not, do we have a session ongoing (file __p2 contains the id)
:tryp2
@for /f "tokens=1,2 delims=,:{} " %%a in (__p2) do @set %%~a=%%~b
@if /I "%modelId%" EQU "" goto error2

:start

@rem first of all, lets check the model has finished processing
@call check_model %modelId%
@if %ERRORLEVEL 1 goto abort

@rem cleanup any previous temp data
@if EXIST __p4 @del __p4
@if EXIST __p5 @del __p5

@echo create target for model %modelId%
::
@curl -u %uname%:%passwd% -H "X-Requested-With: XMLHttpRequest" -H "content-type: application/json" ^
-d "{ \"name\": \"Quadcopter\", \"targetType\": \"standard\", \"targetSdk\": \"10.9\", \"models\": [ { \"name\": \"Quadcopter Standard Target\", \"modelId\": \"%modelId%\", \"optimizeTrackingFor\": \"LOW_FEATURE_OBJECTS\", \"automaticColoring\": \"auto\", \"upVector\": [0.0, 1.0, 0.0], \"views\": [ { \"name\": \"viewpoint_0000\", \"layout\": \"landscape\", \"guideViewPosition\": { \"translation\": [0.19104722142219543, 0.19300971925258636, 0.2014508694410324], \"rotation\": [-0.23911770032491195, 0.36964383294987413, 0.09904579601423466, 0.892399065690545] } } ] } ] }" ^
-k %server%/ExperienceService/products/v1/target %verbose% --output __p4
::
@for /f "tokens=1,2 delims=,:{} " %%a in (__p4) do @set %%~a=%%~b
@echo created target %targetid% - checking status...

@rem run in a loop, checking target gen status...
:test
@curl -u %uname%:%passwd% -H "X-Requested-With: XMLHttpRequest" -s -k %server%/ExperienceService/products/v1/target/status/%targetid% --output __p5
@for /f "tokens=1,2 delims=,:{} " %%a in (__p5) do @set %%~a=%%~b
@echo checking status = %status%
@if /I %status% EQU queued goto test
@if /I %status% EQU inProgress goto test
@echo target creation status = %status%
@set ERRORLEVEL=0
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
