<?php
$envFile = __DIR__ . '/.env';
if (!file_exists($envFile)) {
    die("ERROR: .env file not found\n");
}

$lines = file($envFile, FILE_IGNORE_NEW_LINES);
echo "Total lines in .env: " . count($lines) . "\n\n";

echo "Checking around line 31:\n";
for ($i = 28; $i <= min(33, count($lines) - 1); $i++) {
    $lineNum = $i + 1;
    $line = $lines[$i];
    echo "Line $lineNum: " . trim($line) . "\n";
    
    // Check for syntax issues
    if (preg_match('/[(){}[\]]/', $line) && !preg_match('/^#/', trim($line))) {
        $openParens = substr_count($line, '(');
        $closeParens = substr_count($line, ')');
        if ($openParens !== $closeParens) {
            echo "  ⚠️  WARNING: Unmatched parentheses!\n";
        }
    }
}

echo "\n";
echo "Testing parse_ini_file:\n";
$result = @parse_ini_file($envFile);
if ($result === false) {
    $error = error_get_last();
    $errorMsg = $error['message'] ?? 'Unknown error';
    echo "❌ ERROR: " . $errorMsg . "\n";
    file_put_contents(__DIR__ . '/env-validation-result.txt', "ERROR: " . $errorMsg . "\n");
} else {
    echo "✅ .env file parsed successfully!\n";
    file_put_contents(__DIR__ . '/env-validation-result.txt', "✅ No syntax errors found!\nTotal lines: " . count($lines) . "\n");
}
