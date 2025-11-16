<?php

namespace App\Support\Diagnostics;

use Illuminate\Console\Events\CommandFinished;
use Illuminate\Console\Events\CommandStarting;
use Illuminate\Queue\Events\JobFailed;
use Illuminate\Queue\Events\JobProcessed;
use Illuminate\Queue\Events\JobProcessing;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class SystemProbe
{
    private static bool $registered = false;

    public static function register(): void
    {
        if (self::$registered) {
            return;
        }

        self::$registered = true;

        if (! app()->bound('probe.request_id')) {
            app()->singleton('probe.request_id', fn (): string => (string) Str::uuid());
        }

        register_shutdown_function(function (): void {
            $error = error_get_last();

            if (! $error || ! self::isFatal($error['type'])) {
                return;
            }

            Log::channel('probe')->critical('fatal.shutdown', self::context([
                'error_type' => $error['type'],
                'error_message' => $error['message'],
                'error_file' => $error['file'],
                'error_line' => $error['line'],
            ]));
        });

        Event::listen(CommandStarting::class, function (CommandStarting $event): void {
            Log::channel('probe')->info('command.start', self::context([
                'command' => $event->command,
                'input' => (string) $event->input,
            ]));
        });

        Event::listen(CommandFinished::class, function (CommandFinished $event): void {
            Log::channel('probe')->info('command.finish', self::context([
                'command' => $event->command,
                'exit_code' => $event->exitCode,
            ]));
        });

        Event::listen(JobProcessing::class, function (JobProcessing $event): void {
            Log::channel('probe')->debug('queue.job.processing', self::context([
                'job' => $event->job->getName(),
                'connection' => $event->connectionName,
                'queue' => $event->job->getQueue(),
            ]));
        });

        Event::listen(JobProcessed::class, function (JobProcessed $event): void {
            Log::channel('probe')->debug('queue.job.processed', self::context([
                'job' => $event->job->getName(),
                'connection' => $event->connectionName,
                'queue' => $event->job->getQueue(),
            ]));
        });

        Event::listen(JobFailed::class, function (JobFailed $event): void {
            Log::channel('probe')->error('queue.job.failed', self::context([
                'job' => $event->job->getName(),
                'connection' => $event->connectionName,
                'queue' => $event->job->getQueue(),
                'exception' => $event->exception->getMessage(),
            ]));
        });
    }

    public static function currentRequestId(): ?string
    {
        return app()->has('probe.request_id') ? app('probe.request_id') : null;
    }

    public static function putRequestId(string $requestId): void
    {
        app()->instance('probe.request_id', $requestId);
    }

    public static function context(array $extra = []): array
    {
        $request = (app()->runningInConsole() || ! app()->resolved('request')) ? null : request();

        return array_merge([
            'request_id' => self::currentRequestId(),
            'php_sapi' => PHP_SAPI,
            'memory_usage' => memory_get_usage(true),
            'memory_peak' => memory_get_peak_usage(true),
            'uri' => $request?->fullUrl(),
            'method' => $request?->getMethod(),
            'ip' => $request?->ip(),
        ], $extra);
    }

    private static function isFatal(int $type): bool
    {
        return in_array($type, [
            E_ERROR,
            E_PARSE,
            E_CORE_ERROR,
            E_COMPILE_ERROR,
            E_USER_ERROR,
            E_RECOVERABLE_ERROR,
        ], true);
    }
}


