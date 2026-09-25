#!/usr/bin/env bash
# Fail unless TAG is a vX.Y.Z tag on MAIN_REF whose package.json version matches.
#   scripts/check-release.sh v1.2.3 [origin/main]
set -euo pipefail
tag=${1:?usage: check-release.sh vX.Y.Z [main-ref]}
main_ref=${2:-origin/main}

if ! [[ "$tag" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
	echo "::error::$tag is not a vX.Y.Z tag" >&2
	exit 1
fi
if ! git merge-base --is-ancestor "$tag^{commit}" "$main_ref" 2>/dev/null; then
	echo "::error::$tag is not on $main_ref" >&2
	exit 1
fi
version=$(git show "$tag:package.json" | node -p 'JSON.parse(require("fs").readFileSync(0, "utf8")).version')
if [ "v$version" != "$tag" ]; then
	echo "::error::package.json version $version does not match $tag" >&2
	exit 1
fi
echo "$tag OK"
