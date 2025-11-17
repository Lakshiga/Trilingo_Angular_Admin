@echo off
echo ========================================
echo Uploading ALL Angular Build Files to S3
echo ========================================
echo.

REM Set variables
set BUCKET_NAME=my-project-data-us-east-1-easyapps-trilingo-2026
set REGION=ap-southeast-1
set SOURCE_DIR=dist\trilingo-admin-angular

echo Step 1: Checking if build exists...
if not exist "%SOURCE_DIR%\index.html" (
    echo.
    echo ERROR: Build not found!
    echo Please run: npm run build:cloudfront
    echo.
    pause
    exit /b 1
)

echo Build found! 
echo.
echo Step 2: Listing files to upload:
dir /b %SOURCE_DIR% | findstr /V "Directory"
echo.

echo Step 3: Uploading ALL files to S3 bucket ROOT...
echo Bucket: %BUCKET_NAME%
echo Region: %REGION%
echo.

REM Check if AWS CLI is installed
where aws >nul 2>nul
if errorlevel 1 (
    echo.
    echo ========================================
    echo AWS CLI not found!
    echo ========================================
    echo.
    echo Please manually upload ALL files from:
    echo %CD%\%SOURCE_DIR%
    echo.
    echo To S3 bucket: %BUCKET_NAME% (at ROOT level, NOT in level-01/)
    echo.
    echo Required files:
    echo   - index.html
    echo   - main-*.js (e.g., main.2c1d858c24466158.js)
    echo   - polyfills-*.js (e.g., polyfills.d45f5f1ba103655a.js)
    echo   - runtime-*.js (e.g., runtime.4f6432e42c79848d.js)
    echo   - styles-*.css (e.g., styles.3981fc5196f3854e.css)
    echo   - All numbered chunk files (*.js)
    echo   - assets/ folder (entire folder with contents)
    echo   - 3rdpartylicenses.txt
    echo.
    echo IMPORTANT: Upload to bucket ROOT, not in level-01/ folder!
    echo.
    pause
    exit /b 1
)

REM Sync all files to S3 ROOT (not in subfolder)
echo Uploading files to S3...
aws s3 sync %SOURCE_DIR% s3://%BUCKET_NAME%/ --delete --region %REGION%

if errorlevel 1 (
    echo.
    echo ERROR: Upload failed!
    echo Please check AWS credentials and permissions.
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Upload completed successfully!
echo ========================================
echo.
echo IMPORTANT: Next steps:
echo.
echo 1. Go to S3 Console: https://console.aws.amazon.com/s3/
echo 2. Open bucket: %BUCKET_NAME%
echo 3. Go to Objects tab (at ROOT level, not in level-01/)
echo 4. Select ALL files (Ctrl+A)
echo 5. Click Actions -^> Make public using ACL
echo 6. Confirm
echo.
echo 7. Go to CloudFront Console
echo 8. Select distribution for d3v81eez8ecmto.cloudfront.net
echo 9. Go to Invalidations tab
echo 10. Create invalidation for path: /*
echo 11. Wait 5-10 minutes for completion
echo.
echo 12. Test: https://d3v81eez8ecmto.cloudfront.net
echo.
pause

