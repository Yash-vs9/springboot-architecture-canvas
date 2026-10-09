#!/usr/bin/env bash
set -e

echo "Building production bundle..."
npm run build
touch dist/.nojekyll

echo "Publishing dist to gh-pages branch..."
cd dist
git init -b gh-pages
git config user.name "Yash-vs9"
git config user.email "yash@users.noreply.github.com"
git add -A
git commit -m "deploy: update GitHub Pages build $(date -u +'%Y-%m-%d %H:%M:%S UTC')"

# If github-cred exists, use it for authenticated push, otherwise rely on local git credentials
if [ -f "/home/lakkyshukla74339/github-cred" ]; then
  TOKEN=$(cat /home/lakkyshukla74339/github-cred | tr -d '\r\n[:space:]')
  git remote add origin "https://x-access-token:${TOKEN}@github.com/Yash-vs9/springboot-architecture-canvas.git"
else
  git remote add origin "https://github.com/Yash-vs9/springboot-architecture-canvas.git"
fi

git push -f origin gh-pages
rm -rf .git
echo "Deployment to GitHub Pages complete!"
