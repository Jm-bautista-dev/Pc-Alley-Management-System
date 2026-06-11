$lines = Get-Content frontend/src/components/Logo.js
$line24 = $lines[23] # 0-indexed
Write-Output "Line 24 length: $($line24.Length)"
Write-Output "Line 24 end: $($line24.Substring($line24.Length - 50))"
Write-Output "Line 25 start: $($lines[24])"
