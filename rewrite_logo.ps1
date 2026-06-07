$content = Get-Content frontend/src/components/Logo.js -Raw
# Find the base64 part.
$pattern = 'const logoSrc = "(data:image/png;base64,[A-Za-z0-9+/=]+)"'
$match = [regex]::Match($content, $pattern)
if ($match.Success) {
    $base64 = $match.Groups[1].Value
    
    $newLogoBranding = "export const LogoBrandingV2 = ({ className = """" }) => {`n" +
                       "  const logoSrc = ""$base64"";`n" +
                       "  return (`n" +
                       "    <div className=""relative w-full h-full overflow-hidden rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100/50 shadow-sm flex items-center justify-center p-2"">`n" +
                       "      <img src={logoSrc} alt=""PC Alley Logo"" className=""w-full h-full object-contain scale-[2.2]"" />`n" +
                       "    </div>`n" +
                       "  );`n" +
                       "};`n"
    
    # Replace the whole LogoBrandingV2 block.
    # It seems to start from 'export const LogoBrandingV2' and go until 'export default'
    $finalPattern = 'export const LogoBrandingV2[\s\S]+(?=export default)'
    $content = $content -replace $finalPattern, $newLogoBranding
    
    Set-Content frontend/src/components/Logo.js $content -NoNewline
} else {
    Write-Error "Could not find base64 string"
}
