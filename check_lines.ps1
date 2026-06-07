$lines = Get-Content frontend/src/components/Logo.js
Write-Output "Line 23: $($lines[22])"
Write-Output "Line 24 start: $($lines[23].Substring(0, 100))"
Write-Output "Line 24 end: $($lines[23].Substring($lines[23].Length - 100))"
Write-Output "Line 25: $($lines[24])"
Write-Output "Line 26: $($lines[25])"
