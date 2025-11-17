@echo off
echo Building Angular application...
call npm run build:cloudfront

if errorlevel 1 (
    echo Build failed! Please check errors above.
    pause
    exit /b 1
)

echo.
echo Build completed successfully!
echo Uploading to S3 bucket root...
echo.

REM Upload to S3 bucket ROOT (not in level-01/)
set BUCKET_NAME=my-project-data-us-east-1-easyapps-trilingo-2026
set REGION=ap-southeast-1
set SOURCE_DIR=dist\trilingo-admin-angular

REM Check if AWS CLI is installed
where aws >nul 2>nul
if errorlevel 1 (
    echo AWS CLI not found! Please install AWS CLI first.
    echo Or manually upload files from %SOURCE_DIR% to S3 bucket root
    pause
    exit /b 1
)

REM Sync files to S3
aws s3 sync %SOURCE_DIR% s3://%BUCKET_NAME%/ --delete --region %REGION%

if errorlevel 1 (
    echo Upload failed! Please check AWS credentials and permissions.
    pause
    exit /b 1
)

echo.
echo Upload completed successfully!
echo.
echo Next steps:
echo 1. Go to S3 Console and make all files public
echo 2. Verify CloudFront origin path is EMPTY (not level-01)
echo 3. Create CloudFront invalidation for /*
echo 4. Wait 5-10 minutes and test: https://d3v81eez8ecmto.cloudfront.net
echo.
echo IMPORTANT: If you get 403 error on login:
echo - See FIX_CLOUDFRONT_403_ERROR.md for complete fix guide
echo - Or run: fix-cloudfront-403.ps1 (requires backend API URL)
echo - Or follow: fix-cloudfront-403-manual-steps.md for manual steps
echo.
pause



