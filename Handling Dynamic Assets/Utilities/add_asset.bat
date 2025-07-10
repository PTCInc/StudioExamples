@if "%uname%"=="" goto error1
@if "%passwd%"=="" goto error1
@if "%server%"=="" goto error1

@if "%~1"=="" goto error2
@if "%~2"=="" goto error2

@rem map the file extension to acceptable mimetype
@set v=%~x2
@set ext=%v:~1%
@set map=.pvz-application/pvz;.pdf-application/pdf;.png-image/png;.jpeg-image/jpeg;.jpg-image/jpeg;.avif-image-avif;.webp-image/webp;.txt-text/plain;.json-applications/json;.mp3-audio/mpeg;.mp4-video/mp4
@call set v=%%map:*%v%-=%%
@rem if the first char is a dot, we didnt match anything
@if %v:~0,1%==. goto abort
@rem otherwise, lets got with this...
@set mime=%v:;=&rem.%
 
@rem cleanup any previous temp data
@if EXIST __p6 @del __p6
@echo adding asset %~2 (%mime%) to pxvid %~1
@echo curl -u %uname%:%passwd% -H "X-Requested-With: XMLHttpRequest" -H "name: chopper" -H "pXvId: %~1" -H "content-type: %mime%" -H "X-Requested-With:any"  -H "assetExtension:%ext%" --data-binary "@%~f2" -k %server%/ExperienceService/products/v1/asset -v --output __p6
@curl -u %uname%:%passwd% -H "X-Requested-With: XMLHttpRequest" -H "name: chopper" -H "pXvId: %~1" -H "content-type: %mime%" -H "X-Requested-With:any"  -H "assetExtension:%ext%" --data-binary "@%~f2" -k %server%/ExperienceService/products/v1/asset -v --output __p6
@for /f "delims=:{} tokens=2" %%a in (__p6) do @echo created assetid=%%a
@set ERRORLEVEL=0
@goto done

:abort
@echo Error: file extension %ext% does not match supported file types
@echo        pvz,pdf,png,jpg,jpeg,webp,avif,mp4,mp3,txt,json
@echo:
@set ERRORLEVEL=1
@goto done

:error1
@echo remember to set uname, passwd and server environment variables
@echo:
:error2
@echo usage : add_asset ^<pxvid^> ^<asset file^>
@echo:
@echo    e.g. add_asset doc.pdf
@set ERRORLEVEL=1
:done

