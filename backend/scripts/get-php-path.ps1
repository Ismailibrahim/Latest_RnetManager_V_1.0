# Get PHP Path Utility
# Tries to find PHP from environment variable, PATH, or common locations

$phpPath = $env:PHP_PATH

if (-not $phpPath) {
    # Try to find PHP in PATH
    $phpInPath = Get-Command php -ErrorAction SilentlyContinue
    if ($phpInPath) {
        $phpPath = $phpInPath.Source
    } else {
        # Try common Laragon paths
        $commonPaths = @(
            "C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe",
            "C:\laragon\bin\php\php-8.2.0-Win32-vs16-x64\php.exe",
            "C:\laragon\bin\php\php-8.1.0-Win32-vs16-x64\php.exe",
            "C:\xampp\php\php.exe",
            "C:\wamp64\bin\php\php8.3.0\php.exe"
        )
        
        $phpPath = $null
        foreach ($path in $commonPaths) {
            if (Test-Path $path) {
                $phpPath = $path
                break
            }
        }
        
        if (-not $phpPath) {
            Write-Error "PHP not found. Please set PHP_PATH environment variable or ensure PHP is in your PATH."
            exit 1
        }
    }
}

return $phpPath

