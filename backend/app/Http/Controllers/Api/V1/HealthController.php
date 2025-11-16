<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\File;

class HealthController extends Controller
{
    /**
     * Comprehensive health check with detailed diagnostics
     */
    public function check(): JsonResponse
    {
        $health = [
            'status' => 'healthy',
            'timestamp' => now()->toIso8601String(),
            'uptime' => $this->getUptime(),
            'checks' => [],
        ];

        // Database connection check
        $dbCheck = $this->checkDatabase();
        $health['checks']['database'] = $dbCheck;
        if (!$dbCheck['healthy']) {
            $health['status'] = 'unhealthy';
        }

        // Memory check
        $memoryCheck = $this->checkMemory();
        $health['checks']['memory'] = $memoryCheck;
        if (!$memoryCheck['healthy']) {
            $health['status'] = 'degraded';
        }

        // Disk space check
        $diskCheck = $this->checkDiskSpace();
        $health['checks']['disk'] = $diskCheck;
        if (!$diskCheck['healthy']) {
            $health['status'] = 'degraded';
        }

        // Cache check
        $cacheCheck = $this->checkCache();
        $health['checks']['cache'] = $cacheCheck;

        // Log files check
        $logsCheck = $this->checkLogs();
        $health['checks']['logs'] = $logsCheck;

        // Recent errors check
        $errorsCheck = $this->checkRecentErrors();
        $health['checks']['recent_errors'] = $errorsCheck;
        if ($errorsCheck['error_count'] > 10) {
            $health['status'] = 'degraded';
        }

        // PHP configuration check
        $phpCheck = $this->checkPhpConfig();
        $health['checks']['php'] = $phpCheck;

        // Application info
        $health['application'] = [
            'version' => config('app.version', '1.0.0'),
            'environment' => config('app.env'),
            'debug' => config('app.debug'),
            'timezone' => config('app.timezone'),
        ];

        $statusCode = $health['status'] === 'healthy' ? 200 : ($health['status'] === 'degraded' ? 200 : 503);

        return response()->json($health, $statusCode);
    }

    /**
     * Get crash summary
     */
    public function crashSummary(): JsonResponse
    {
        $summary = \App\Support\CrashReporter::getCrashSummary(7);
        
        return response()->json($summary);
    }

    /**
     * Detailed diagnostics endpoint
     */
    public function diagnostics(): JsonResponse
    {
        $diagnostics = [
            'timestamp' => now()->toIso8601String(),
            'server' => $this->getServerInfo(),
            'php' => $this->getPhpInfo(),
            'database' => $this->getDatabaseInfo(),
            'memory' => $this->getMemoryInfo(),
            'disk' => $this->getDiskInfo(),
            'cache' => $this->getCacheInfo(),
            'logs' => $this->getLogsInfo(),
            'recent_errors' => $this->getRecentErrors(),
            'routes' => $this->getRoutesInfo(),
        ];

        return response()->json($diagnostics);
    }

    private function checkDatabase(): array
    {
        try {
            DB::connection()->getPdo();
            $tables = DB::select("SHOW TABLES");
            
            return [
                'healthy' => true,
                'connected' => true,
                'table_count' => count($tables),
                'connection' => DB::connection()->getName(),
            ];
        } catch (\Exception $e) {
            Log::error('Database health check failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return [
                'healthy' => false,
                'connected' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    private function checkMemory(): array
    {
        $memoryLimit = $this->parseMemoryLimit(ini_get('memory_limit'));
        $memoryUsage = memory_get_usage(true);
        $memoryPeak = memory_get_peak_usage(true);
        $memoryUsagePercent = ($memoryLimit > 0) ? ($memoryUsage / $memoryLimit) * 100 : 0;

        $healthy = $memoryUsagePercent < 80;

        return [
            'healthy' => $healthy,
            'limit' => $this->formatBytes($memoryLimit),
            'usage' => $this->formatBytes($memoryUsage),
            'peak' => $this->formatBytes($memoryPeak),
            'usage_percent' => round($memoryUsagePercent, 2),
            'warning' => $memoryUsagePercent > 80 ? 'Memory usage is high' : null,
        ];
    }

    private function checkDiskSpace(): array
    {
        $storagePath = storage_path();
        $freeSpace = disk_free_space($storagePath);
        $totalSpace = disk_total_space($storagePath);
        $usedSpace = $totalSpace - $freeSpace;
        $usagePercent = ($totalSpace > 0) ? ($usedSpace / $totalSpace) * 100 : 0;

        $healthy = $usagePercent < 90;

        return [
            'healthy' => $healthy,
            'total' => $this->formatBytes($totalSpace),
            'used' => $this->formatBytes($usedSpace),
            'free' => $this->formatBytes($freeSpace),
            'usage_percent' => round($usagePercent, 2),
            'warning' => $usagePercent > 90 ? 'Disk space is running low' : null,
        ];
    }

    private function checkCache(): array
    {
        try {
            $key = 'health_check_' . time();
            Cache::put($key, 'test', 60);
            $retrieved = Cache::get($key);
            Cache::forget($key);

            return [
                'healthy' => $retrieved === 'test',
                'driver' => config('cache.default'),
                'working' => $retrieved === 'test',
            ];
        } catch (\Exception $e) {
            return [
                'healthy' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    private function checkLogs(): array
    {
        $logPath = storage_path('logs');
        $logFile = storage_path('logs/laravel.log');
        
        $size = File::exists($logFile) ? File::size($logFile) : 0;
        $sizeMB = round($size / 1024 / 1024, 2);

        $healthy = $sizeMB < 100; // Warning if log file > 100MB

        return [
            'healthy' => $healthy,
            'log_file_size' => $this->formatBytes($size),
            'log_file_size_mb' => $sizeMB,
            'warning' => $sizeMB > 100 ? 'Log file is very large, consider rotating' : null,
        ];
    }

    private function checkRecentErrors(): array
    {
        $logFile = storage_path('logs/laravel.log');
        $errorCount = 0;
        $lastError = null;

        if (File::exists($logFile)) {
            $lines = file($logFile);
            $recentLines = array_slice($lines, -100); // Last 100 lines
            
            foreach ($recentLines as $line) {
                if (stripos($line, 'ERROR') !== false || 
                    stripos($line, 'CRITICAL') !== false ||
                    stripos($line, 'FATAL') !== false) {
                    $errorCount++;
                    $lastError = trim($line);
                }
            }
        }

        return [
            'error_count' => $errorCount,
            'last_error' => $lastError,
            'timeframe' => 'last 100 log lines',
        ];
    }

    private function checkPhpConfig(): array
    {
        return [
            'version' => PHP_VERSION,
            'memory_limit' => ini_get('memory_limit'),
            'max_execution_time' => ini_get('max_execution_time'),
            'post_max_size' => ini_get('post_max_size'),
            'upload_max_filesize' => ini_get('upload_max_filesize'),
            'opcache_enabled' => ini_get('opcache.enable'),
        ];
    }

    private function getUptime(): ?string
    {
        // Try to get server uptime (works on Linux, not Windows)
        if (function_exists('sys_getloadavg')) {
            return 'Available';
        }
        return 'N/A (Windows)';
    }

    private function getServerInfo(): array
    {
        return [
            'hostname' => gethostname(),
            'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
            'php_sapi' => php_sapi_name(),
            'os' => PHP_OS,
        ];
    }

    private function getPhpInfo(): array
    {
        return [
            'version' => PHP_VERSION,
            'sapi' => php_sapi_name(),
            'extensions' => get_loaded_extensions(),
            'ini_settings' => [
                'memory_limit' => ini_get('memory_limit'),
                'max_execution_time' => ini_get('max_execution_time'),
                'post_max_size' => ini_get('post_max_size'),
                'upload_max_filesize' => ini_get('upload_max_filesize'),
                'opcache.enable' => ini_get('opcache.enable'),
                'opcache.enable_cli' => ini_get('opcache.enable_cli'),
            ],
        ];
    }

    private function getDatabaseInfo(): array
    {
        try {
            $pdo = DB::connection()->getPdo();
            $version = DB::select('SELECT VERSION() as version')[0]->version ?? 'Unknown';
            
            return [
                'connected' => true,
                'driver' => DB::connection()->getDriverName(),
                'version' => $version,
                'database' => DB::connection()->getDatabaseName(),
            ];
        } catch (\Exception $e) {
            return [
                'connected' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    private function getMemoryInfo(): array
    {
        $memoryLimit = $this->parseMemoryLimit(ini_get('memory_limit'));
        $memoryUsage = memory_get_usage(true);
        $memoryPeak = memory_get_peak_usage(true);

        return [
            'limit' => $this->formatBytes($memoryLimit),
            'usage' => $this->formatBytes($memoryUsage),
            'peak' => $this->formatBytes($memoryPeak),
            'usage_percent' => ($memoryLimit > 0) ? round(($memoryUsage / $memoryLimit) * 100, 2) : 0,
        ];
    }

    private function getDiskInfo(): array
    {
        $storagePath = storage_path();
        $freeSpace = disk_free_space($storagePath);
        $totalSpace = disk_total_space($storagePath);
        $usedSpace = $totalSpace - $freeSpace;

        return [
            'total' => $this->formatBytes($totalSpace),
            'used' => $this->formatBytes($usedSpace),
            'free' => $this->formatBytes($freeSpace),
            'usage_percent' => ($totalSpace > 0) ? round(($usedSpace / $totalSpace) * 100, 2) : 0,
        ];
    }

    private function getCacheInfo(): array
    {
        return [
            'driver' => config('cache.default'),
            'prefix' => config('cache.prefix'),
        ];
    }

    private function getLogsInfo(): array
    {
        $logFile = storage_path('logs/laravel.log');
        $size = File::exists($logFile) ? File::size($logFile) : 0;
        $modified = File::exists($logFile) ? File::lastModified($logFile) : null;

        return [
            'log_file_size' => $this->formatBytes($size),
            'last_modified' => $modified ? date('Y-m-d H:i:s', $modified) : null,
        ];
    }

    private function getRecentErrors(): array
    {
        $logFile = storage_path('logs/laravel.log');
        $errors = [];

        if (File::exists($logFile)) {
            $lines = file($logFile);
            $recentLines = array_slice($lines, -200); // Last 200 lines
            
            foreach ($recentLines as $index => $line) {
                if (stripos($line, 'ERROR') !== false || 
                    stripos($line, 'CRITICAL') !== false ||
                    stripos($line, 'FATAL') !== false) {
                    $errors[] = [
                        'line' => count($lines) - count($recentLines) + $index + 1,
                        'message' => trim($line),
                    ];
                }
            }
        }

        return array_slice($errors, -10); // Last 10 errors
    }

    private function getRoutesInfo(): array
    {
        $routes = app('router')->getRoutes();
        
        return [
            'total_routes' => count($routes),
            'api_routes' => count(array_filter($routes->getRoutes(), function ($route) {
                return str_starts_with($route->uri(), 'api/');
            })),
        ];
    }

    private function parseMemoryLimit(string $limit): int
    {
        $limit = trim($limit);
        $last = strtolower($limit[strlen($limit) - 1]);
        $value = (int) $limit;

        switch ($last) {
            case 'g':
                $value *= 1024;
            case 'm':
                $value *= 1024;
            case 'k':
                $value *= 1024;
        }

        return $value;
    }

    private function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        $bytes /= pow(1024, $pow);

        return round($bytes, 2) . ' ' . $units[$pow];
    }
}

