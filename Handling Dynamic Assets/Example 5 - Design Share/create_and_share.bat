@if "%uname%"=="" goto error1
@if "%passwd%"=="" goto error1
@if "%server%"=="" goto error1

@if "%~1"=="" goto error2
@if "%~2"=="" goto error2
@if "%~3"=="" goto error2

@rem cleanup any previous temp data
@if EXIST __p0 @del __p0
@if EXIST __p1 @del __p1
@if EXIST __p2 @del __p2
@if EXIST __p3 @del __p3

@rem and here we go
@set pXvId=
@set modelId=
@set shareId=

::
@echo creating and sharing product %~1 version %~2 with model %~3 > __p0
::
@rem create the product first ...
@call create_product %1 %2
@if %ERRORLEVEL 1 goto abort
@for /f "tokens=1,2 delims=,:{} " %%a in (__p1) do @set %%~a=%%~b
@echo created pxvid=%pXvId%
@if /I "%pXvId%" EQU "" goto error1

@rem ... then the model ...
@call create_model %3 %pXvId%
@if %ERRORLEVEL 1 goto abort
@for /f "tokens=1,2 delims=,:{} " %%a in (__p2) do @set %%~a=%%~b
@if /I "%modelId%" EQU "" goto error1

@call check_model %modelId%
@if %ERRORLEVEL 1 goto abort

@rem ... for designshare, we dont need the target ...
@rem ... but we do need to create the sharable link (thingmark or qr code)
@call share_product %1
@if %ERRORLEVEL 1 goto abort
@for /f "tokens=1,2 delims=,:{} " %%a in (__p3) do @set %%~a=%%~b
@if /I "%shareId%" EQU "" goto error1

:report
@rem ... and we are we are finished
@echo.{"shareId":%shareId%} >> __p0
@echo.{"modelId":%modelId%} >> __p0
@echo.{"pXvId":%pXvId%} >> __p0
@echo.{"productId":%~1} >> __p0
@echo.{"version":%~2} >> __p0
@echo.{"cad":%~3} >> __p0
@type __p0
@set ERRORLEVEL=0

@call get_product %pXvId%
@if %ERRORLEVEL 1 goto abort
@goto done

:abort
@echo aborting due to error
@echo:
:error1
@echo remember to set uname, passwd and server environment variables
@echo:
:error2
@echo usage : create_and_share ^<productID^> ^<version^> ^<pvz^> [thingmark]
@echo:
@echo    e.g. create_and_share quad101 v1 quad.pvz 123:666 
@set ERRORLEVEL=1
:done

