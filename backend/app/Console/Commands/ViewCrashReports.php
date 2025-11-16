<?php

namespace App\Console\Commands;

use App\Support\CrashReporter;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class ViewCrashReports extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'crash:view 
                            {--days=7 : Number of days to look back}
                            {--file= : View a specific crash report file}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'View crash reports and summaries';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        if ($this->option('file')) {
            return $this->viewSpecificFile($this->option('file'));
        }

        $days = (int) $this->option('days');
        $summary = CrashReporter::getCrashSummary($days);

        $this->info("Crash Summary (Last $days days)");
        $this->line("======================================");
        $this->line("");

        $this->line("Total Crashes: " . $summary['total_crashes']);
        $this->line("");

        if (!empty($summary['crashes_by_type'])) {
            $this->info("Crashes by Type:");
            foreach ($summary['crashes_by_type'] as $type => $count) {
                $this->line("  - $type: $count");
            }
            $this->line("");
        }

        if (!empty($summary['recent_crashes'])) {
            $this->info("Recent Crashes:");
            foreach ($summary['recent_crashes'] as $crash) {
                $this->line("  - [" . ($crash['timestamp'] ?? 'Unknown') . "] " . $crash['error_type']);
                $this->line("    " . $crash['message']);
                $this->line("    File: " . $crash['file']);
                $this->line("");
            }
        } else {
            $this->info("No crashes found in the last $days days.");
        }

        // List all crash report files
        $reportPath = storage_path('logs/crashes');
        if (File::exists($reportPath)) {
            $files = File::glob($reportPath . '/crash-*.json');
            if (count($files) > 0) {
                $this->line("");
                $this->info("All Crash Report Files:");
                foreach ($files as $file) {
                    $fileTime = File::lastModified($file);
                    $this->line("  - " . basename($file) . " (" . date('Y-m-d H:i:s', $fileTime) . ")");
                }
                $this->line("");
                $this->line("To view a specific crash report, use:");
                $this->line("  php artisan crash:view --file=" . basename($files[0]));
            }
        }

        return Command::SUCCESS;
    }

    private function viewSpecificFile(string $filename): int
    {
        $reportPath = storage_path('logs/crashes');
        $filePath = $reportPath . '/' . $filename;

        if (!File::exists($filePath)) {
            $this->error("Crash report file not found: $filename");
            return Command::FAILURE;
        }

        try {
            $report = json_decode(File::get($filePath), true);

            if (!$report) {
                $this->error("Failed to parse crash report file.");
                return Command::FAILURE;
            }

            $this->info("Crash Report: $filename");
            $this->line("======================================");
            $this->line("");

            $this->line("Timestamp: " . ($report['timestamp'] ?? 'Unknown'));
            $this->line("Error Type: " . ($report['error_type'] ?? 'Unknown'));
            $this->line("Message: " . ($report['message'] ?? 'Unknown'));
            $this->line("");

            if (!empty($report['context'])) {
                $this->info("Context:");
                $this->line(json_encode($report['context'], JSON_PRETTY_PRINT));
                $this->line("");
            }

            if (!empty($report['server'])) {
                $this->info("Server Info:");
                foreach ($report['server'] as $key => $value) {
                    $this->line("  $key: $value");
                }
                $this->line("");
            }

            if (!empty($report['php'])) {
                $this->info("PHP Info:");
                foreach ($report['php'] as $key => $value) {
                    if (is_array($value)) {
                        $this->line("  $key:");
                        foreach ($value as $k => $v) {
                            $this->line("    $k: $v");
                        }
                    } else {
                        $this->line("  $key: $value");
                    }
                }
                $this->line("");
            }

            if (!empty($report['memory'])) {
                $this->info("Memory Info:");
                foreach ($report['memory'] as $key => $value) {
                    $this->line("  $key: $value");
                }
                $this->line("");
            }

            if (!empty($report['recent_logs'])) {
                $this->info("Recent Errors from Logs:");
                foreach ($report['recent_logs'] as $log) {
                    $this->line("  Line {$log['line']}: {$log['message']}");
                }
            }

            return Command::SUCCESS;
        } catch (\Exception $e) {
            $this->error("Error reading crash report: " . $e->getMessage());
            return Command::FAILURE;
        }
    }
}

