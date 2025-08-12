# Network Access Guide

## Accessing from Other Devices

### Server Status
- **Local Access**: http://localhost:8008
- **Network Access**: http://[YOUR-COMPUTER-IP]:8008
- **Port**: 8008
- **Protocol**: HTTP (not HTTPS)

### Finding Your Computer's IP Address
1. **Windows**: Open Command Prompt and run `ipconfig`
2. **Look for**: IPv4 Address under your active network adapter
3. **Example**: If your IP is 192.168.1.12, access via http://192.168.1.12:8008

### Important Notes
- ⚠️ **Use HTTP, not HTTPS**: The server only supports HTTP connections
- 🔥 **Firewall**: Make sure Windows Firewall allows Python through port 8008
- 📱 **Mobile/Tablet**: Ensure your device is on the same WiFi network
- 🌐 **Browser**: Use any modern web browser

### Troubleshooting Connection Issues
1. **HTTPS Errors**: Make sure you're using `http://` not `https://`
2. **Firewall Blocking**: Allow Python or port 8008 through Windows Firewall
3. **Wrong Network**: Ensure both devices are on the same WiFi network
4. **IP Changed**: Re-check your computer's IP address with `ipconfig`

### Firewall Configuration
If you can't connect from other devices:
1. Open Windows Defender Firewall
2. Click "Allow an app or feature through Windows Defender Firewall"
3. Click "Change Settings" then "Allow another app..."
4. Browse to Python.exe and add it
5. OR create a new rule for port 8008

### Example URLs
- **From same computer**: http://localhost:8008
- **From phone/tablet**: http://192.168.1.12:8008 (replace with your actual IP)
- **From another computer**: http://192.168.1.12:8008 (replace with your actual IP)
