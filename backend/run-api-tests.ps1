# API Test Runner Script
param(
    [switch]$StartServer = $false
)

# Get PHP path from environment or auto-detect
$phpPath = $env:PHP_PATH
if (-not $phpPath) {
    $phpInPath = Get-Command php -ErrorAction SilentlyContinue
    if ($phpInPath) {
        $phpPath = $phpInPath.Source
    } else {
        $phpPath = "C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe"
        if (-not (Test-Path $phpPath)) {
            Write-Error "PHP not found. Please set PHP_PATH environment variable."
            exit 1
        }
    }
}
$baseUrl = "http://localhost:8000"

Write-Host "=== API Test Runner ===" -ForegroundColor Cyan
Write-Host ""

# Test function
function Test-ApiEndpoint {
    param(
        [string]$Method,
        [string]$Url,
        [string]$Description,
        [hashtable]$Headers = @{},
        [string]$Body = $null
    )
    
    Write-Host "Testing: $Description" -ForegroundColor Yellow
    Write-Host "  $Method $Url" -ForegroundColor Gray
    
    try {
        $ch = [System.Net.WebRequest]::Create($Url)
        $ch.Method = $Method
        $ch.Timeout = 5000
        
        # Add headers
        foreach ($key in $Headers.Keys) {
            $ch.Headers.Add($key, $Headers[$key])
        }
        
        # Add body for POST/PUT
        if ($Body -and ($Method -eq "POST" -or $Method -eq "PUT")) {
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($Body)
            $ch.ContentLength = $bytes.Length
            $ch.ContentType = "application/json"
            $stream = $ch.GetRequestStream()
            $stream.Write($bytes, 0, $bytes.Length)
            $stream.Close()
        }
        
        $response = $ch.GetResponse()
        $stream = $response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $responseBody = $reader.ReadToEnd()
        $statusCode = $response.StatusCode
        
        $reader.Close()
        $stream.Close()
        $response.Close()
        
        if ($statusCode -eq 200 -or $statusCode -eq 201) {
            Write-Host "  ✅ SUCCESS - Status: $statusCode" -ForegroundColor Green
            Write-Host "  Response: $($responseBody.Substring(0, [Math]::Min(100, $responseBody.Length)))" -ForegroundColor Gray
            return $true
        } else {
            Write-Host "  ⚠ Status: $statusCode" -ForegroundColor Yellow
            Write-Host "  Response: $($responseBody.Substring(0, [Math]::Min(100, $responseBody.Length)))" -ForegroundColor Gray
            return $false
        }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq 404) {
            Write-Host "  ❌ NOT FOUND (404)" -ForegroundColor Red
        } elseif ($statusCode -eq 401) {
            Write-Host "  ⚠ UNAUTHORIZED (401) - Auth required" -ForegroundColor Yellow
        } elseif ($statusCode -eq 500) {
            Write-Host "  ❌ SERVER ERROR (500)" -ForegroundColor Red
        } else {
            Write-Host "  ❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
        }
        return $false
    }
    Write-Host ""
}

# Check if server is running
Write-Host "Checking if server is running..." -ForegroundColor Yellow
try {
    $ch = [System.Net.WebRequest]::Create("$baseUrl/api/v1/")
    $ch.Method = "GET"
    $ch.Timeout = 2000
    $response = $ch.GetResponse()
    $response.Close()
    Write-Host "✓ Server is running" -ForegroundColor Green
    Write-Host ""
} catch {
    if ($StartServer) {
        Write-Host "Starting server..." -ForegroundColor Yellow
        Start-Process -FilePath $phpPath -ArgumentList "artisan","serve" -WindowStyle Hidden
        Start-Sleep -Seconds 8
        Write-Host "✓ Server started" -ForegroundColor Green
        Write-Host ""
    } else {
        Write-Host "✗ Server is not running!" -ForegroundColor Red
        Write-Host "Run with -StartServer to start it automatically" -ForegroundColor Yellow
        exit 1
    }
}

# Run tests
Write-Host "=== Running API Tests ===" -ForegroundColor Cyan
Write-Host ""

$testResults = @()

# Test 1: Health Check
$testResults += [PSCustomObject]@{
    Test = "Health Check"
    Result = Test-ApiEndpoint -Method "GET" -Url "$baseUrl/health" -Description "Health Check Endpoint"
}

# Test 2: API v1 Root
$testResults += [PSCustomObject]@{
    Test = "API v1 Root"
    Result = Test-ApiEndpoint -Method "GET" -Url "$baseUrl/api/v1/" -Description "API v1 Root Endpoint"
}

# Test 3: Currency Test Route
$testResults += [PSCustomObject]@{
    Test = "Currency Test Route"
    Result = Test-ApiEndpoint -Method "GET" -Url "$baseUrl/api/v1/currencies-test" -Description "Currency Test Route"
}

# Test 4: Simple Test Route
$testResults += [PSCustomObject]@{
    Test = "Simple Test Route"
    Result = Test-ApiEndpoint -Method "GET" -Url "$baseUrl/api/v1/test-simple" -Description "Simple Test Route"
}

# Test 5: Currencies Endpoint (requires auth)
$testResults += [PSCustomObject]@{
    Test = "Currencies Endpoint"
    Result = Test-ApiEndpoint -Method "GET" -Url "$baseUrl/api/v1/currencies" -Description "Currencies Endpoint (Auth Required)"
}

# Test 6: Payment Methods (requires auth)
$testResults += [PSCustomObject]@{
    Test = "Payment Methods"
    Result = Test-ApiEndpoint -Method "GET" -Url "$baseUrl/api/v1/payment-methods" -Description "Payment Methods (Auth Required)"
}

Write-Host ""
Write-Host "=== Test Summary ===" -ForegroundColor Cyan
$passed = ($testResults | Where-Object { $_.Result -eq $true }).Count
$total = $testResults.Count
Write-Host "Passed: $passed / $total" -ForegroundColor $(if ($passed -eq $total) { "Green" } else { "Yellow" })
Write-Host ""

foreach ($result in $testResults) {
    $status = if ($result.Result) { "✅" } else { "❌" }
    Write-Host "$status $($result.Test)" -ForegroundColor $(if ($result.Result) { "Green" } else { "Red" })
}

