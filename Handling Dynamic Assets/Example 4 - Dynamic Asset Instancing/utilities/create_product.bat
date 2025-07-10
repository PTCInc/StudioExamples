@if "%uname%"=="" goto error1
@if "%passwd%"=="" goto error1
@if "%server%"=="" goto error1

@if "%~1"=="" goto error2
@if "%~2"=="" goto error2

@rem cleanup any previous temp data
@if EXIST __p1 @del __p1

@rem and here we go
@echo creating product %1 version %2 with name %3

@rem use ^ to break up commands onto multiple lines (makes it easier to read)
curl -u %uname%:%passwd% -H "X-Requested-With: XMLHttpRequest" -H "content-type: application/json" ^
-d "{ \"productId\": \"%~1\", \"version\": \"%~2\", \"name\": \"%~3\", \"description\": \"Example data - change this to whatever you need\" }" ^
-k %server%/ExperienceService/products/v1/product %verbose% --output __p1
::
@for /f "tokens=1,2 delims=,:{} " %%a in (__p1) do  @set %%~a=%%~b
@echo %pXvId%
@if /I "%pXvId%" EQU "" goto abort
@set ERRORLEVEL=0
@goto done

:abort
@echo Error accessing server
@set ERRORLEVEL=1
@goto done
:error1
@echo remember to set uname, passwd and server environment variables
@echo:
:error2
@echo usage : create_product ^<productID^> ^<version^> [name]
@echo:
@echo    e.g. create_product quad101 v1 quadcopter 
@set ERRORLEVEL=1
:done

