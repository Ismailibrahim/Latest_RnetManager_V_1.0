<?php
/**
 * Validate .env file for syntax errors
 */

$envFile = __DIR__ . '/.env';
if (!file_exists($envFile)) {
    die("ERROR: .env file not found\n");
}

echo "==========================================\n";
echo "Validating .env File\n";
echo "==========================================\n\n";

$lines = file($envFile, FILE_IGNORE_NEW_LINES);
$errors = [];
$lineNum = 0;

foreach ($lines as $lineNum => $line) {
    $lineNum++; // 1-based line numbers
    $originalLine = $line;
    $line = trim($line);
    
    // Skip empty lines and comments
    if (empty($line) || $line[0] === '#') {
        continue;
    }
    
    // Check for common syntax errors
    if (strpos($line, '=') === false && !empty($line)) {
        $errors[] = "Line $lineNum: Missing '=' sign - $originalLine";
        continue;
    }
    
    // Check for unclosed parentheses in values
    if (preg_match('/^[^=]+=(.+)$/', $line, $matches)) {
        $value = $matches[1];
         // Count parentheses
         $openParens = substr_count($value, '(');
         $closeParens = substr_count($value, ')');
         
         if ($openParens !== $closeParens) {
             $errors[] = "Line $lineNum: Unmatched parentheses - $originalLine";
         }
         
         // Check for unquoted values with special characters that should be quoted
         if (preg_match('/[(){}[\]]/', $value) && 
             !preg_match('/^["\'].*["\']$/', trim($value)) &&
             !preg_match('/^\$\{.*\}$/', trim($value))) {
             $errors[] = "Line $lineNum: Value with special characters should be quoted - $originalLine";
         }
     }
     
     // Check for bash-style variable substitution syntax
     if (preg_match('/\$\{[^}]+\}/', $line, $matches)) {
         // Validate bash variable syntax
         foreach ($matches as $match) {
             if (!preg_match('/^\$\{[A-Z_][A-Z0-9_]*(\:-[^}]*)?\}$/', $match)) {
                 $errors[] = "Line $lineNum: Invalid variable syntax '$match' - $originalLine";
             }
         }
     }
 }
 
 // Try to parse with parse_ini_file to catch other errors
 $tempIni = tempnam(sys_get_temp_dir(), 'env_');
 copy($envFile, $tempIni);
 try {
    $result = @parse_ini_file($tempIni);
    if ($result === false) {
        $lastError = error_get_last();
        if ($lastError && strpos($lastError['message'], 'line') !== false) {
            // Extract line number from error
            if (preg_match('/line (\d+)/i', $lastError['message'], $match)) {
                $errorLine = (int)$match[1];
                $errors[] = "Line $errorLine: " . $lastError['message'];
            } else {
                $errors[] = "Parse error: " . $lastError['message'];
            }
        }
    }
} catch (\Exception $e) {
    $errors[] = "Parse exception: " . $e->getMessage();
} finally {
    @unlink($tempIni);
}

// Display results
if (empty($errors)) {
    echo "✅ No syntax errors found!\n";
    echo "\nFile has " . count($lines) . " lines\n";
} else {
    echo "❌ Found " . count($errors) . " error(s):\n\n";
    foreach ($errors as $error) {
        echo "  - $error\n";
    }
    
    echo "\n";
    echo "Line 31 content:\n";
    if (isset($lines[30])) {
        echo "  " . $lines[30] . "\n";
    } else {
        echo "  (Line 31 does not exist)\n";
    }
}

echo "\n==========================================\n";

// Write to file
file_put_contents(__DIR__ . '/validate-env-result.txt', implode("\n", [
    "Validation Results:",
    "===================",
    empty($errors) ? "✅ No syntax errors found!" : "❌ Found " . count($errors) . " error(s):",
    "",
    empty($errors) ? "" : implode("\n", array_map(fn($e) => "  - $e", $errors)),
    "",
    "Total lines: " . count($lines),
    isset($lines[30]) ? "Line 31: " . trim($lines[30]) : "Line 31: (does not exist)"
]));