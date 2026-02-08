#!/bin/bash

set -e

# Build the project
echo "Building project..."
bun run build

# Check if dist directory exists
if [ ! -d "dist" ]; then
    echo "Error: dist directory not found after build"
    exit 1
fi

# Create a .nojekyll file to bypass Jekyll processing on GitHub Pages
touch dist/.nojekyll

# Get the current branch and commit hash
BRANCH=$(git rev-parse --abbrev-ref HEAD)
COMMIT=$(git rev-parse --short HEAD)

echo "Deploying to GitHub Pages..."
echo "Current branch: $BRANCH"
echo "Current commit: $COMMIT"

# Check if gh-pages branch exists locally
if git show-ref --verify --quiet refs/heads/gh-pages; then
    # Branch exists locally, delete it
    git branch -D gh-pages
fi

# Create a new gh-pages branch from the current commit
git checkout --orphan gh-pages

# Remove all files except dist
git rm -rf .

# Move dist contents to root
cp -r dist/* .
cp dist/.nojekyll . 2>/dev/null || true

# Remove dist directory
rm -rf dist

# Remove node_modules if they got copied (shouldn't be deployed)
rm -rf node_modules

# Add all files
git add -A

# Commit
git commit -m "Deploy to GitHub Pages from commit $COMMIT"

# Push to origin gh-pages
git push origin gh-pages --force

# Go back to the original branch
git checkout "$BRANCH"

echo "Deployment complete!"
echo "Your site should be available at: https://$(git remote get-url origin | sed 's/.*github.com[:/]//' | sed 's/\.git$//' | sed 's/^\([^/]*\)$/\1\/\1/').github.io/"
