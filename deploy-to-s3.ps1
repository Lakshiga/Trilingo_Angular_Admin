# PowerShell Script to Deploy Angular App to S3
# Run this from the trilingo-admin-angular directory

Write-Host "Building Angular application..." -ForegroundColor Green
npm run build:cloudfront

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed! Please check errors above." -ForegroundColor Red
    exit 1
}

Write-Host "`nBuild completed successfully!" -ForegroundColor Green
Write-Host "Uploading to S3 bucket root..." -ForegroundColor Yellow

# Upload to S3 bucket ROOT (not in level-01/)
$bucketName = "my-project-data-us-east-1-easyapps-trilingo-2026"
$region = "ap-southeast-1"
$sourceDir = "dist/trilingo-admin-angular"

# Check if AWS CLI is installed
$awsCli = Get-Command aws -ErrorAction SilentlyContinue
if (-not $awsCli) {
    Write-Host "AWS CLI not found! Please install AWS CLI first." -ForegroundColor Red
    Write-Host "Or manually upload files from $sourceDir to S3 bucket root" -ForegroundColor Yellow
    exit 1
}

# Sync files to S3
aws s3 sync $sourceDir s3://$bucketName/ --delete --region $region

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nUpload completed successfully!" -ForegroundColor Green
    Write-Host "`nNext steps:" -ForegroundColor Yellow
    Write-Host "1. Go to S3 Console and make all files public" -ForegroundColor White
    Write-Host "2. Verify CloudFront origin path is EMPTY (not level-01)" -ForegroundColor White
    Write-Host "3. Create CloudFront invalidation for /*" -ForegroundColor White
    Write-Host "4. Wait 5-10 minutes and test: https://d3v81eez8ecmto.cloudfront.net" -ForegroundColor White
} else {
    Write-Host "Upload failed! Please check AWS credentials and permissions." -ForegroundColor Red
}













