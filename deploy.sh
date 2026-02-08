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

# Setup worktree for gh-pages to avoid switching branches in main working directory
WORKTREE_DIR=".gh-pages-worktree"

# Clean up any existing worktree
if [ -d "$WORKTREE_DIR" ]; then
    rm -rf "$WORKTREE_DIR"
fi

# Create worktree for gh-pages branch
git worktree add "$WORKTREE_DIR" -B gh-pages

# Copy dist contents to worktree
cp -r dist/* "$WORKTREE_DIR/"
cp dist/.nojekyll "$WORKTREE_DIR/" 2>/dev/null || true

# Remove node_modules if they somehow got copied
rm -rf "$WORKTREE_DIR/node_modules"

# Commit and push from worktree
cd "$WORKTREE_DIR"
git add -A
git commit -m "Deploy to GitHub Pages from commit $COMMIT" || echo "No changes to commit"
git push origin gh-pages --force
cd ..

# Clean up worktree
git worktree remove "$WORKTREE_DIR" || rm -rf "$WORKTREE_DIR"

echo "Deployment complete!"
echo "Your site should be available at: https://$(git remote get-url origin | sed 's/.*github.com[:/]//' | sed 's/\.git$//' | sed 's/^\([^/]*\)$/\1\/\1/').github.io/"
