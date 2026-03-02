@echo off
REM Quick Netlify Deploy Script for Windows

echo 🚀 Building frontend...
cd frontend
call npm run build

echo.
echo 📦 Deploying to Netlify...
call npx netlify-cli deploy --prod --dir=out

echo.
echo ✅ Done! Check the URL above
pause
