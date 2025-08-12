# PowerShell script to add firewall rule for Anime Watch List Server
# Must be run as Administrator

Write-Host "Adding Windows Firewall rule for Anime Watch List Server..." -ForegroundColor Green
Write-Host "This requires Administrator privileges." -ForegroundColor Yellow
Write-Host ""

try {
    # Add the firewall rule
    New-NetFirewallRule -DisplayName "Anime Watch List Server" -Direction Inbound -Protocol TCP -LocalPort 8008 -Action Allow -ErrorAction Stop
    
    Write-Host "SUCCESS: Firewall rule added successfully!" -ForegroundColor Green
    Write-Host "Your server should now be accessible from other devices at:" -ForegroundColor Green
    Write-Host "http://192.168.1.12:8008" -ForegroundColor Cyan
    Write-Host ""
    
    # Test if server is running
    $serverTest = Test-NetConnection -ComputerName localhost -Port 8008 -InformationLevel Quiet
    if ($serverTest) {
        Write-Host "✅ Server is running and accessible locally" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Server might not be running. Make sure Python HTTP server is started." -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "ERROR: Failed to add firewall rule." -ForegroundColor Red
    Write-Host "Please run this script as Administrator:" -ForegroundColor Red
    Write-Host "Right-click on PowerShell and select 'Run as administrator'" -ForegroundColor Red
    Write-Host "Then run: .\add_firewall_rule.ps1" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error details: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
