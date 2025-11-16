<?php

namespace App\Support;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class CrashReporter
{
    /**
     * Generate a comprehensive crash report
     */
    public static function report(string $errorType, string $message, array $context = []): void
    {
        $timestamp = now()->toIso8601String();
        $reportPath = storage_path('logs/crashes');
        
        if (!File::exists($reportPath)) {
            File::makeDirectory($reportPath, 0755, true);
        }
        
        $reportFile = $reportPath . '/crash-' . date('Y-m-d_His') . '.json';
        
        $report = [
            'timestamp' => $timestamp,
            'error_type' => $errorType,
            'message' => $message,
            'context' => $context,
            'server' => self::getServerInfo(),
            'php' => self::getPhpInfo(),
            'memory' => self::getMemoryInfo(),
            'request' => self::getRequestInfo(),
            'database' => self::getDatabaseInfo(),
            'recent_logs' => self::getRecentLogs(),
        ];
        
        File::put($reportFile, json_encode($report, JSON_PRETTY_PRINT));
        
        // Also log to main log file
        Log::critical("CRASH REPORTED: $errorType - $message", $context);
        
        // Log to crash log file
        $crashLogFile = storage_path('logs/crashes.log');
        $logEntry = sprintf(
            "[%s] %s: %s\nContext: %s\n\n",
            $timestamp,
            $errorType,
            $message,
            json_encode($context, JSON_PRETTY_PRINT)
        );
        File::append($crashLogFile, $logEntry);
    }
    
    /**
     * Generate a summary of all crashes
     */
    public static function getCrashSummary(int $days = 7): array
    {
        $reportPath = storage_path('logs/crashes');
        $summary = [
            'total_crashes' => 0,
            'crashes_by_type' => [],
            'recent_crashes' => [],
            'timeframe' => "$days days",
        ];
        
        if (!File::exists($reportPath)) {
            return $summary;
        }
        
        $files = File::glob($reportPath . '/crash-*.json');
        $cutoffTime = now()->subDays($days)->timestamp;
        
        foreach ($files as $file) {
            $fileTime = File::lastModified($file);
            
            if ($fileTime < $cutoffTime) {
                continue;
            }
            
            try {
                $report = json_decode(File::get($file), true);
                
                if ($report) {
                    $summary['total_crashes']++;
                    
                    $errorType = $report['error_type'] ?? 'unknown';
                    $summary['crashes_by_type'][$errorType] = 
                        ($summary['crashes_by_type'][$errorType] ?? 0) + 1;
                    
                    $summary['recent_crashes'][] = [
                        'timestamp' => $report['timestamp'] ?? null,
                        'error_type' => $errorType,
                        'message' => $report['message'] ?? 'Unknown error',
                        'file' => basename($file),
                    ];
                }
            } catch (\Exception $e) {
                // Skip corrupted files
                continue;
            }
        }
        
        // Sort recent crashes by timestamp (newest first)
        usort($summary['recent_crashes'], function ($a, $b) {
            return strcmp($b['timestamp'] ?? '', $a['timestamp'] ?? '');
        });
        
        // Limit to last 20 crashes
        $summary['recent_crashes'] = array_slice($summary['recent_crashes'], 0, 20);
        
        return $summary;
    }
    
    private static function getServerInfo(): array
    {
        return [
            'hostname' => gethostname(),
            'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
            'php_sapi' => php_sapi_name(),
            'os' => PHP_OS,
        ];
    }
    
    private static function getPhpInfo(): array
    {
        return [
            'version' => PHP_VERSION,
            'sapi' => php_sapi_name(),
            'memory_limit' => ini_get('memory_limit'),
            'max_execution_time' => ini_get('max_execution_time'),
        ];
    }
    
    private static function getMemoryInfo(): array
    {
        return [
            'usage' => memory_get_usage(true),
            'peak' => memory_get_peak_usage(true),
            'limit' => ini_get('memory_limit'),
        ];
    }
    
    private static function getRequestInfo(): array
    {
        if (!isset($_SERVER['REQUEST_METHOD'])) {
            return ['note' => 'No active request'];
        }
        
        return [
            'method' => $_SERVER['REQUEST_METHOD'] ?? 'Unknown',
            'uri' => $_SERVER['REQUEST_URI'] ?? 'Unknown',
            'ip' => $_SERVER['REMOTE_ADDR'] ?? 'Unknown',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown',
        ];
    }
    
    private static function getDatabaseInfo(): array
    {
        try {
            $pdo = \Illuminate\Support\Facades\DB::connection()->getPdo();
            return [
                'connected' => true,
                'driver' => \Illuminate\Support\Facades\DB::connection()->getDriverName(),
            ];
        } catch (\Exception $e) {
            return [
                'connected' => false,
                'error' => $e->getMessage(),
            ];
        }
    }
    
    private static function getRecentLogs(int $lines = 50): array
    {
        $logFile = storage_path('logs/laravel.log');
        
        if (!File::exists($logFile)) {
            return [];
        }
        
        $allLines = file($logFile);
        $recentLines = array_slice($allLines, -$lines);
        
        $errors = [];
        foreach ($recentLines as $index => $line) {
            if (stripos($line, 'ERROR') !== false || 
                stripos($line, 'CRITICAL') !== false ||
                stripos($line, 'FATAL') !== false) {
                $errors[] = [
                    'line' => count($allLines) - count($recentLines) + $index + 1,
                    'message' => trim($line),
                ];
            }
        }
        
        return array_slice($errors, -10); // Last 10 errors
    }
}

