@rem remember to set these values
@rem set uname=
@rem set passwd=
@rem set server=

@rem takes a list of parameters (these being the IDs from the map) and 
@rem it will delete them, one at a time.
@rem for example, to delete 3 items from the map...
@rem > delmapid 12 42 68

:delid
@echo deleting map id %1
@curl -u %uname%:%passwd% -k -H "X-Requested-With: XMLHttpRequest" -X DELETE %server%/ExperienceService/id-resolution/mappings/%1

@shift
@if NOT "%1"=="" GOTO delid
