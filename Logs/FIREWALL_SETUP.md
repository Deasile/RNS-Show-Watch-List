# Windows Firewall Setup for Network Access

## Quick Setup (Recommended)

### Option 1: Allow Python through Firewall
1. Press `Win + R`, type `firewall.cpl`, press Enter
2. Click "Allow an app or feature through Windows Defender Firewall"
3. Click "Change Settings" (requires admin rights)
4. Click "Allow another app..."
5. Click "Browse..." and navigate to your Python installation:
   - Usually: `C:\Users\[YourName]\AppData\Local\Programs\Python\Python3x\python.exe`
   - Or: `C:\Python3x\python.exe`
6. Select Python.exe and click "Add"
7. Make sure both "Private" and "Public" are checked for Python
8. Click "OK"

### Option 2: Create Port Rule (Advanced)
1. Press `Win + R`, type `wf.msc`, press Enter
2. Click "Inbound Rules" in left panel
3. Click "New Rule..." in right panel
4. Select "Port" → Next
5. Select "TCP" and enter "8008" in Specific local ports
6. Select "Allow the connection" → Next
7. Check all network types → Next
8. Name it "Anime Watch List Server" → Finish

## Testing Network Access

### From Your Computer
- Test URL: http://localhost:8008
- This should always work

### From Other Devices (Phone/Tablet/Another Computer)
- Test URL: http://192.168.1.12:8008
- Make sure device is on same WiFi network
- ⚠️ **Important**: Use HTTP, not HTTPS!

## Troubleshooting

### Common Issues:
1. **"This site can't be reached"**
   - Check firewall settings
   - Verify both devices on same network
   - Make sure you're using HTTP not HTTPS

2. **SSL/TLS Errors**
   - You're using HTTPS instead of HTTP
   - Change `https://` to `http://`

3. **Connection Timeout**
   - Windows Firewall is blocking
   - Follow firewall setup above

4. **Server Not Responding**
   - Check if Python server is still running
   - Restart server if needed

### Verification Steps:
1. Server running: Check terminal for "Serving HTTP on 0.0.0.0 port 8008"
2. Firewall configured: Python allowed or port 8008 open
3. Network connected: Both devices on same WiFi
4. Correct URL: Using HTTP not HTTPS

## Server Information
- **Protocol**: HTTP (not HTTPS)
- **Port**: 8008
- **Binding**: All interfaces (0.0.0.0)
- **Access URLs**:
  - Local: http://localhost:8008
  - Network: http://192.168.1.12:8008
