#!/usr/bin/env bash
set -e

echo "Building production bundle..."
npm run build
touch dist/.nojekyll

echo "Publishing dist to gh-pages branch..."
cd dist
git init -b gh-pages
git config user.name "Yash Vardhan Shukla"
git config user.email "lakkyshukla74339@gmail.com"
git add -A
git commit -m "deploy: update GitHub Pages build $(date -u +'%Y-%m-%d %H:%M:%S UTC')"

# Use GITHUB_TOKEN environment variable if set, otherwise standard git remote
if [ -n "$GITHUB_TOKEN" ]; then
  git remote add origin "https://x-access-token:${GITHUB_TOKEN}@github.com/Yash-vs9/springboot-architecture-canvas.git"
elif [ -f "$HOME/.github-token" ]; then
  TOKEN=$(cat "$HOME/.github-token" | tr -d '\r\n[:space:]')
  git remote add origin "https://x-access-token:${TOKEN}@github.com/Yash-vs9/springboot-architecture-canvas.git"
elif [ -f "$HOME/github-cred" ]; then
  TOKEN=$(cat "$HOME/github-cred" | tr -d '\r\n[:space:]')
  git remote add origin "https://x-access-token:${TOKEN}@github.com/Yash-vs9/springboot-architecture-canvas.git"
else
  git remote add origin "https://github.com/Yash-vs9/springboot-architecture-canvas.git"
fi

git push -f origin gh-pages
rm -rf .git
echo "Deployment to GitHub Pages complete!"
