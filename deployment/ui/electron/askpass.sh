#!/bin/sh
# sudo runs this helper (SUDO_ASKPASS) when it needs a password and has no
# terminal, as when setup.py is started from the app. The password goes from
# the dialog straight to sudo on stdout; the app never sees it.
if command -v zenity >/dev/null 2>&1; then
  exec zenity --password --title="Telematics Deploy: administrator password"
fi
if command -v ssh-askpass >/dev/null 2>&1; then
  exec ssh-askpass "$1"
fi
echo "No graphical password helper found. Install zenity, or run setup.py from a terminal." >&2
exit 1
