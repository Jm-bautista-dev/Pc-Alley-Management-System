$line = (Get-Content frontend/src/components/Logo.js)[23]
$index = $line.IndexOf('alt="PC Alley Logo"')
Write-Output "Index of alt: $index"
if ($index -ge 0) {
    Write-Output "Context: $($line.Substring($index - 50, 100))"
}
