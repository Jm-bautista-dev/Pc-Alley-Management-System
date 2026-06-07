$content = Get-Content frontend/src/components/Logo.js -Raw
# The issue is that the base64 string is not closed and the rest of the component is on the same line or messed up.
# We look for the start of the logoSrc assignment and the next alt attribute.
# We assume the base64 string ends right before the alt attribute starts.

# First, let's try to find if "alt=" exists inside what SHOULD be the logoSrc string.
$pattern = 'const logoSrc = "(data:image/png;base64,[^"]+)\s+alt="PC Alley Logo"'
# If the quote is missing, it might look like this:
$pattern2 = 'const logoSrc = "(data:image/png;base64,[A-Za-z0-9+/=]+)\s+alt="PC Alley Logo"'

# Let's try a very broad match to capture the whole block and restructure it.
$pattern3 = 'const logoSrc = "(data:image/png;base64,[^"]+)"\s+alt="PC Alley Logo"\s+className="([^"]+)"\s+/>\s+</div>\s+\);\s+};'

# Wait, if line 24 length is 373349 and it ends with the component closing...
# and my debug script said line 24 end is 'ject-contain scale-[2.2]" />\n    </div>\n  );\n};'
# Then the "alt=" must be in there.

$newContent = $content -replace 'const logoSrc = "(data:image/png;base64,[A-Za-z0-9+/=]+)\s+alt="PC Alley Logo"', 'const logoSrc = "$1"; return ( <div className="relative w-full h-full overflow-hidden rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100/50 shadow-sm flex items-center justify-center p-2"> <img src={logoSrc} alt="PC Alley Logo"'

# Cleanup if there are double returns or missing tags
# ...

Set-Content frontend/src/components/Logo.js $newContent
