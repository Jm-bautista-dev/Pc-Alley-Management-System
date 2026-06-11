$line = (Get-Content frontend/src/components/Logo.js)[23]
# Find the first occurrence of "return (" or similar after the base64 start.
$match = [regex]::Match($line, 'return\s*\(')
if ($match.Success) {
    Write-Output "Found return at $($match.Index)"
    Write-Output "Before return: $($line.Substring($match.Index - 20, 20))"
} else {
    Write-Output "Return not found"
}
