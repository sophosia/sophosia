tag=$(git describe --tags --abbrev=0)
git add .
git commit -m "update publish.yml"
git push origin main
git tag v$((${tag#v} + 1))
git push origin --tags