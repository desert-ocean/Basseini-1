$ErrorActionPreference = 'Stop'

$root = Get-Location
$indexPath = Join-Path $root 'index.html'
$footerPattern = '(?s)<footer id="footer">.*?</footer>'
$indexContent = Get-Content $indexPath -Raw -Encoding UTF8
$footerMatch = [regex]::Match($indexContent, $footerPattern)
if (-not $footerMatch.Success) {
    throw 'Footer block not found in index.html'
}

$footerBlock = $footerMatch.Value
$encoding = New-Object System.Text.UTF8Encoding($false)
$modified = New-Object System.Collections.Generic.List[string]

Get-ChildItem -File -Recurse -Filter *.html | Where-Object { $_.FullName -ne $indexPath } | ForEach-Object {
    $path = $_.FullName
    $content = Get-Content $path -Raw -Encoding UTF8
    if ($content -match $footerPattern) {
        $updated = [regex]::Replace($content, $footerPattern, [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $footerBlock }, 1)
        if ($updated -ne $content) {
            [System.IO.File]::WriteAllText($path, $updated, $encoding)
            $modified.Add($path) | Out-Null
        }
    }
}

Write-Output ("Modified files: {0}" -f $modified.Count)
$modified | Sort-Object | ForEach-Object { Write-Output $_ }
