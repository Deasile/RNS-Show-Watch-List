@echo off
echo Adding Windows Firewall rule for Anime Watch List Server...
echo This requires Administrator privileges.
echo.

netsh advfirewall firewall add rule name="Anime Watch List Server" dir=in action=allow protocol=TCP localport=8008

if %errorlevel% equ 0 (
    echo.
    echo SUCCESS: Firewall rule added successfully!
    echo Your server should now be accessible from other devices at:
    echo http://192.168.1.12:8008
    echo.
) else (
    echo.
    echo ERROR: Failed to add firewall rule.
    echo Please run this file as Administrator.
    echo Right-click and select "Run as administrator"
    echo.
)

pause
