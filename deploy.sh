#!/bin/bash
# Automated deploy script for source and GitHub Pages build
# Usage: bash deploy.sh

set -e

# 1. Commit and push source code to main branch

echo "Committing and pushing source code to main branch..."
git add .
git commit -m "Update source code"
git push origin main

# 2. Build the app

echo "Building the app..."
npm run build

# 3. Deploy build to gh-pages branch using gh-pages package

echo "Deploying build to gh-pages branch..."
npm run deploy

echo "Deployment complete!"
