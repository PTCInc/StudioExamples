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
@if EXIST __p4 @del __p4
@if EXIST __p5 @del __p5

@rem and here we go
@set pXvId=
@set modelId=
@set targetId=
::
@echo creating product %~1 version %~2 with model %~3 > __p0
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

@rem ... then the target ...
@call create_target %modelId%
@if %ERRORLEVEL 1 goto abort
@for /f "tokens=1,2 delims=,:{} " %%a in (__p3) do @set %%~a=%%~b
@if /I "%targetId%" EQU "" goto error1

:report
@rem ... and we are we are finished
@echo.{"targetId":%targetId%} > __p0
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
@echo usage : create_all ^<productID^> ^<version^> ^<pvz^>
@echo:
@echo    e.g. create_all quad101 v1 quad.pvz 
@set ERRORLEVEL=1
:done

