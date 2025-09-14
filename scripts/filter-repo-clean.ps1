$ErrorActionPreference = 'Stop'

# Clean the history from sensitive files and force-push current branch
# Usage: .\scripts\filter-repo-clean.ps1

$branch = (git rev-parse --abbrev-ref HEAD).Trim()
Write-Host "Branch: $branch"

Write-Host 'Fetching remotes...'
git fetch --all --prune | Out-Null

$ref = "refs/heads/$branch"
$paths = @(
  'api-server/firebase-service-account.json',
  'service-account.json.json'
)
$globs = @(
  '*service-account*.json',
  '*.p12',
  '*.pem',
  '*.key',
  '*.enc'
)
$args = @('--force','--refs', $ref, '--invert-paths')
foreach ($p in $paths) { $args += @('--path', $p) }
foreach ($g in $globs) { $args += @('--path-glob', $g) }

Write-Host 'Running git-filter-repo...'
python -m git_filter_repo @args
Write-Host 'git-filter-repo done.'

Write-Host 'Cleaning refs/original backups...'
$orig = git for-each-ref --format='%(refname)' refs/original/
if ($orig) { $orig | ForEach-Object { git update-ref -d $_ } }

Write-Host 'Aggressive GC...'
git reflog expire --expire=now --all
git gc --prune=now --aggressive | Out-Null

Write-Host 'Force-pushing...'
git push origin $branch --force

Write-Host 'Verifying recent history (last 300 commits)...'
$scan = git --no-pager log -n 300 --name-only --pretty=format:
$hits = $scan | Select-String -Pattern 'service-account|firebase-service-account|\.p12$|\.pem$|\.key$|\.enc$' -SimpleMatch | Select-Object -First 10
if ($hits) { $hits | ForEach-Object { $_.Line } } else { Write-Host 'OK: none found' }

Write-Host 'Done.'
