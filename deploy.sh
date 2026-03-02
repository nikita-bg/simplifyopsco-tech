#!/bin/bash
# Quick Netlify Deploy Script

echo "🚀 Building frontend..."
cd frontend
npm run build

echo ""
echo "📦 Deploying to Netlify..."
npx netlify-cli deploy --prod --dir=out

echo ""
echo "✅ Done! Check the URL above"
