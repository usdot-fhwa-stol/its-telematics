#!/bin/bash

# If DB_PASSWORD_FILE is defined and points to an existing file, read it into DB_PASSWORD
if [ -n "$DB_PASSWORD_FILE" ] && [ -f "$DB_PASSWORD_FILE" ]; then
    export DB_PASSWORD="$(cat "$DB_PASSWORD_FILE" | tr -d '\r\n')"
    unset DB_PASSWORD_FILE
fi

# Start the main app
npm start & 

# Start the file upload service
npm run file-upload-server &

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?