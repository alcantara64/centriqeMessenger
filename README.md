

Environment settings explained

PROCESS_STARTUP_DELAY_ENABLED=true
default (if not provided): false
Is the startup delayed or not? This is of use in a production server environment where multiple 
message-service containers run simultaneously. It ensures that they dont execute at the same time.

PROCESS_STARTUP_DELAY_MAX_SECONDS=30
Used only if PROCESS_STARTUP_DELAY_ENABLED=true. Provides the maximum number of seconds the delay can have.

PROCESS_CRON_SCHEDULE='* * * * *'
default (if not provided): * * * * * * (runs every second)
The cron schedule (https://www.npmjs.com/package/node-cron)

Additional feature
The seconds parameter in the schedule can be provided with [x] where x is a number.
For example, '[4] * * * * *' will generate 'a,b,c,d * * * * *' with a to d being random numbers between 0 and 59
This is supposed to help with running multiple instances of the messaging service
