# 🚨 Quick Fix: Login Error "Cannot connect to the server"

## ⚡ Immediate Solution

### Step 1: Check if Backend is Running

Open a new browser tab and go to:
```
http://localhost:5166/swagger
```

**✅ If Swagger opens:** Backend is running, skip to Step 3  
**❌ If it doesn't open:** Backend is NOT running, go to Step 2

---

### Step 2: Start Backend Server

Open **PowerShell** or **Command Prompt** and run:

```powershell
# Navigate to backend folder
cd "C:\Users\HP\Desktop\25.11.2025Admin Angular\Trilingo_Backend\TES_Learning_App.API"

# Start backend
dotnet run
```

**Wait for this message:**
```
Now listening on: http://0.0.0.0:5166
```

✅ Once you see this, backend is running!

---

### Step 3: Try Login Again

Go back to your Angular app (`http://localhost:4200/login`) and try logging in again.

---

## 🔍 If Still Not Working

### Check Browser Console (F12)

1. Press **F12** to open DevTools
2. Go to **Console** tab
3. Look for errors

**Common Errors:**

#### Error 1: CORS Error
```
Access to XMLHttpRequest at 'http://localhost:5166/api/auth/login' 
from origin 'http://localhost:4200' has been blocked by CORS policy
```

**Solution:** Backend CORS is already configured. Make sure backend is in Development mode (not Production).

#### Error 2: Connection Refused
```
Failed to connect to localhost:5166
```

**Solution:** Backend is not running. Follow Step 2 above.

#### Error 3: Port Already in Use
```
Address already in use: 5166
```

**Solution:** 
```powershell
# Find what's using port 5166
netstat -ano | findstr :5166

# Kill the process (replace <PID> with the number you see)
taskkill /PID <PID> /F

# Then start backend again
dotnet run
```

---

## 🎯 Quick Checklist

- [ ] Backend is running (`dotnet run` shows "listening on port 5166")
- [ ] Swagger opens at `http://localhost:5166/swagger`
- [ ] No CORS errors in browser console
- [ ] Angular app is running on `http://localhost:4200`
- [ ] Try login again

---

## 💡 Pro Tips

1. **Keep Backend Running:** Don't close the terminal where backend is running
2. **Check Both Terminals:** 
   - Terminal 1: Angular (`ng serve`)
   - Terminal 2: Backend (`dotnet run`)
3. **Use Swagger:** Test API directly at `http://localhost:5166/swagger`
4. **Check Network Tab:** In DevTools → Network tab, see the actual request/response

---

## 📞 Still Having Issues?

1. Check `src/environments/environment.ts` - should have:
   ```typescript
   apiUrl: 'http://localhost:5166/api'
   ```

2. Check backend `Program.cs` - CORS should allow `http://localhost:4200`

3. Restart both:
   - Stop Angular (Ctrl+C)
   - Stop Backend (Ctrl+C)
   - Start Backend first: `dotnet run`
   - Then start Angular: `ng serve`

---

**Last Updated:** 2025-01-25

