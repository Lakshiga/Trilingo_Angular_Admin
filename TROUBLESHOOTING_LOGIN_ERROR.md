# 🔧 Login Error Troubleshooting Guide

## Error: "Cannot connect to the server"

### ✅ Quick Fix Steps

#### Step 1: Check if Backend is Running

Open a new terminal/PowerShell and run:

```powershell
# Navigate to backend folder
cd "C:\Users\HP\Desktop\25.11.2025Admin Angular\Trilingo_Backend\TES_Learning_App.API"

# Run the backend
dotnet run
```

**Expected Output:**
```
info: Microsoft.Hosting.Lifetime[14]
      Now listening on: http://0.0.0.0:5166
```

✅ If you see this, backend is running!

---

#### Step 2: Verify Backend is Accessible

Open your browser and go to:
```
http://localhost:5166/swagger
```

✅ If Swagger UI opens, backend is working!

❌ If it doesn't open, backend is not running or port is wrong.

---

#### Step 3: Check Port Conflicts

If port 5166 is already in use:

```powershell
# Check what's using port 5166
netstat -ano | findstr :5166

# Kill the process (replace <PID> with actual number)
taskkill /PID <PID> /F
```

---

#### Step 4: Check Browser Console

1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Look for CORS errors like:
   ```
   Access to XMLHttpRequest at 'http://localhost:5166/api/auth/login' 
   from origin 'http://localhost:4200' has been blocked by CORS policy
   ```

**If you see CORS error:**
- Backend CORS configuration needs to allow `http://localhost:4200`
- Check `Program.cs` in backend for CORS settings

---

#### Step 5: Verify API URL Configuration

Check `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5166/api', // ✅ Should be this
  // ...
};
```

---

#### Step 6: Test API Directly

Open browser and test the login endpoint:

```
POST http://localhost:5166/api/auth/login
Content-Type: application/json

{
  "identifier": "admin",
  "password": "Admin123!"
}
```

**Using Browser:**
1. Open DevTools (F12)
2. Go to **Network** tab
3. Try to login
4. Check the failed request
5. See error details

---

## 🔍 Common Issues & Solutions

### Issue 1: Backend Not Running

**Symptoms:**
- Error: "Cannot connect to the server"
- Status: 0
- Network tab shows failed request

**Solution:**
```powershell
cd "C:\Users\HP\Desktop\25.11.2025Admin Angular\Trilingo_Backend\TES_Learning_App.API"
dotnet run
```

---

### Issue 2: Wrong Port

**Symptoms:**
- Backend running on different port (e.g., 5000, 7000)
- Frontend trying to connect to 5166

**Solution:**

**Option A: Change Backend Port**
Edit `Trilingo_Backend/TES_Learning_App.API/Program.cs`:
```csharp
builder.WebHost.UseUrls("http://0.0.0.0:5166"); // Change to your port
```

**Option B: Override in Frontend**
Open browser console and run:
```javascript
localStorage.setItem('apiUrl', 'http://localhost:YOUR_PORT/api');
location.reload();
```

---

### Issue 3: CORS Error

**Symptoms:**
- Console shows CORS policy error
- Network tab shows preflight (OPTIONS) request failed

**Solution:**
Check backend `Program.cs` has CORS configured:
```csharp
builder.Services.AddCors(options => {
    options.AddPolicy("AllowAngular", policy => {
        policy.WithOrigins("http://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

app.UseCors("AllowAngular");
```

---

### Issue 4: Database Connection Error

**Symptoms:**
- Backend starts but crashes
- Error about database connection

**Solution:**
```powershell
# Start SQL Server LocalDB
sqllocaldb start MSSQLLocalDB

# Then restart backend
dotnet run
```

---

## 🧪 Testing Checklist

- [ ] Backend is running (`dotnet run` shows "listening on port 5166")
- [ ] Swagger UI opens at `http://localhost:5166/swagger`
- [ ] No CORS errors in browser console
- [ ] `environment.ts` has correct `apiUrl: 'http://localhost:5166/api'`
- [ ] Network tab shows request going to correct URL
- [ ] SQL Server LocalDB is running

---

## 📞 Still Not Working?

### Debug Steps:

1. **Check Browser Console:**
   - Open DevTools (F12)
   - Go to Console tab
   - Look for red error messages
   - Copy the full error message

2. **Check Network Tab:**
   - Open DevTools (F12)
   - Go to Network tab
   - Try to login
   - Click on the failed request
   - Check:
     - Request URL (should be `http://localhost:5166/api/auth/login`)
     - Status (should not be 0)
     - Response (if any)

3. **Check Backend Logs:**
   - Look at the terminal where backend is running
   - Check for error messages
   - Look for "Now listening on" message

4. **Verify Environment:**
   ```typescript
   // Check src/environments/environment.ts
   apiUrl: 'http://localhost:5166/api' // ✅ Correct
   ```

---

## ✅ Success Indicators

When everything is working:

1. ✅ Backend terminal shows: `Now listening on: http://0.0.0.0:5166`
2. ✅ Swagger UI opens at `http://localhost:5166/swagger`
3. ✅ Browser console shows: `[HttpClientService] Final Base URL: http://localhost:5166/api`
4. ✅ Login request succeeds (status 200)
5. ✅ You're redirected to `/dashboard`

---

## 🚀 Quick Command Reference

```powershell
# Start SQL Server
sqllocaldb start MSSQLLocalDB

# Navigate to backend
cd "C:\Users\HP\Desktop\25.11.2025Admin Angular\Trilingo_Backend\TES_Learning_App.API"

# Run backend
dotnet run

# Check port usage
netstat -ano | findstr :5166

# Kill process on port
taskkill /PID <PID> /F
```

---

**Last Updated:** 2025-01-25  
**Status:** ✅ Ready to use

