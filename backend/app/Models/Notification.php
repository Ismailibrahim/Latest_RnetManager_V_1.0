<?php

namespace App\Models;

use App\Services\EmailNotificationService;
use App\Services\SmsNotificationService;
use App\Services\TelegramNotificationService;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Log;

class Notification extends Model
{
    use HasFactory;

    protected $fillable = [
        'landlord_id',
        'type',
        'title',
        'message',
        'priority',
        'action_url',
        'expires_at',
        'sent_via',
        'is_read',
        'metadata',
    ];

    protected $casts = [
        'is_read' => 'boolean',
        'expires_at' => 'datetime',
        'metadata' => 'array',
    ];

    /**
     * The "booted" method of the model.
     */
    protected static function booted(): void
    {
        static::created(function (Notification $notification) {
            // Send email if notification is set to be sent via email
            if (in_array($notification->sent_via, ['email', 'all'])) {
                static::sendEmailForNotification($notification);
            }

            // Send SMS if notification is set to be sent via SMS
            if (in_array($notification->sent_via, ['sms', 'all'])) {
                static::sendSmsForNotification($notification);
            }

            // Send Telegram if notification is set to be sent via Telegram
            if (in_array($notification->sent_via, ['telegram', 'all'])) {
                static::sendTelegramForNotification($notification);
            }
        });
    }

    /**
     * Send email for a notification.
     */
    protected static function sendEmailForNotification(Notification $notification): void
    {
        try {
            $emailService = app(EmailNotificationService::class);

            // Get recipient email from metadata or resolve from context
            $recipientEmail = static::resolveRecipientEmail($notification);

            if (empty($recipientEmail)) {
                Log::info("Email notification skipped - no recipient email available", [
                    'notification_id' => $notification->id,
                    'type' => $notification->type,
                ]);
                return;
            }

            // Prepare email data
            $emailData = [
                'title' => $notification->title,
                'message' => $notification->message,
                'type' => $notification->type,
                'action_url' => $notification->action_url,
            ];

            // Merge metadata into email data for template rendering
            if ($notification->metadata) {
                $emailData = array_merge($emailData, $notification->metadata);
            }

            $emailService->sendNotification(
                $notification->landlord_id,
                $notification->type,
                $emailData,
                $recipientEmail
            );
        } catch (\Exception $e) {
            Log::error("Failed to send email for notification: {$e->getMessage()}", [
                'notification_id' => $notification->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Send SMS for a notification.
     */
    protected static function sendSmsForNotification(Notification $notification): void
    {
        try {
            $smsService = app(SmsNotificationService::class);

            // Get recipient phone number from metadata or resolve from context
            $recipientPhone = static::resolveRecipientPhone($notification);

            if (empty($recipientPhone)) {
                Log::info("SMS notification skipped - no recipient phone available", [
                    'notification_id' => $notification->id,
                    'type' => $notification->type,
                ]);
                return;
            }

            // Prepare SMS data
            $smsData = [
                'title' => $notification->title,
                'message' => $notification->message,
                'type' => $notification->type,
                'action_url' => $notification->action_url,
            ];

            // Merge metadata into SMS data for template rendering
            if ($notification->metadata) {
                $smsData = array_merge($smsData, $notification->metadata);
            }

            $smsService->sendNotification(
                $notification->landlord_id,
                $notification->type,
                $smsData,
                $recipientPhone
            );
        } catch (\Exception $e) {
            Log::error("Failed to send SMS for notification: {$e->getMessage()}", [
                'notification_id' => $notification->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Send Telegram for a notification.
     */
    protected static function sendTelegramForNotification(Notification $notification): void
    {
        try {
            $telegramService = app(TelegramNotificationService::class);

            // Get recipient chat ID from metadata or use default from settings
            $recipientChatId = static::resolveRecipientChatId($notification);

            // Prepare Telegram data
            $telegramData = [
                'title' => $notification->title,
                'message' => $notification->message,
                'type' => $notification->type,
                'action_url' => $notification->action_url,
            ];

            // Merge metadata into Telegram data for template rendering
            if ($notification->metadata) {
                $telegramData = array_merge($telegramData, $notification->metadata);
            }

            // Send the notification (will use default chat ID from settings if not provided)
            $telegramService->sendNotification(
                $notification->landlord_id,
                $notification->type,
                $telegramData,
                $recipientChatId
            );
        } catch (\Exception $e) {
            Log::error("Failed to send Telegram for notification: {$e->getMessage()}", [
                'notification_id' => $notification->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    public function landlord(): BelongsTo
    {
        return $this->belongsTo(Landlord::class);
    }

    /**
     * Resolve recipient email from metadata or context.
     *
     * @param  Notification  $notification
     * @return string|null
     */
    protected static function resolveRecipientEmail(Notification $notification): ?string
    {
        // First, check metadata for direct email
        if ($notification->metadata) {
            if (! empty($notification->metadata['email'])) {
                return $notification->metadata['email'];
            }

            // Try to resolve from tenant_id in metadata
            if (! empty($notification->metadata['tenant_id'])) {
                $tenant = Tenant::find($notification->metadata['tenant_id']);
                if ($tenant && ! empty($tenant->email)) {
                    return $tenant->email;
                }
            }

            // Try to resolve from tenant_unit_id in metadata
            if (! empty($notification->metadata['tenant_unit_id'])) {
                $tenantUnit = TenantUnit::with('tenant')->find($notification->metadata['tenant_unit_id']);
                if ($tenantUnit && $tenantUnit->tenant && ! empty($tenantUnit->tenant->email)) {
                    return $tenantUnit->tenant->email;
                }
            }
        }

        // For system notifications, send to landlord's primary user (owner/admin)
        if ($notification->type === 'system') {
            $landlord = $notification->landlord;
            if ($landlord) {
                $primaryUser = $landlord->users()
                    ->whereIn('role', [User::ROLE_OWNER, User::ROLE_ADMIN])
                    ->where('is_active', true)
                    ->first();
                if ($primaryUser && ! empty($primaryUser->email)) {
                    return $primaryUser->email;
                }
            }
        }

        return null;
    }

    /**
     * Resolve recipient phone from metadata or context.
     *
     * @param  Notification  $notification
     * @return string|null
     */
    protected static function resolveRecipientPhone(Notification $notification): ?string
    {
        // First, check metadata for direct phone
        if ($notification->metadata) {
            if (! empty($notification->metadata['phone']) || ! empty($notification->metadata['mobile'])) {
                return $notification->metadata['phone'] ?? $notification->metadata['mobile'];
            }

            // Try to resolve from tenant_id in metadata
            if (! empty($notification->metadata['tenant_id'])) {
                $tenant = Tenant::find($notification->metadata['tenant_id']);
                if ($tenant && ! empty($tenant->phone)) {
                    return $tenant->phone;
                }
            }

            // Try to resolve from tenant_unit_id in metadata
            if (! empty($notification->metadata['tenant_unit_id'])) {
                $tenantUnit = TenantUnit::with('tenant')->find($notification->metadata['tenant_unit_id']);
                if ($tenantUnit && $tenantUnit->tenant && ! empty($tenantUnit->tenant->phone)) {
                    return $tenantUnit->tenant->phone;
                }
            }
        }

        // For system notifications, send to landlord's primary user (owner/admin)
        if ($notification->type === 'system') {
            $landlord = $notification->landlord;
            if ($landlord) {
                $primaryUser = $landlord->users()
                    ->whereIn('role', [User::ROLE_OWNER, User::ROLE_ADMIN])
                    ->where('is_active', true)
                    ->first();
                if ($primaryUser && ! empty($primaryUser->mobile)) {
                    return $primaryUser->mobile;
                }
            }
        }

        return null;
    }

    /**
     * Resolve recipient chat ID from metadata or context.
     *
     * @param  Notification  $notification
     * @return string|null
     */
    protected static function resolveRecipientChatId(Notification $notification): ?string
    {
        // First, check metadata for direct chat_id
        if ($notification->metadata && ! empty($notification->metadata['chat_id'])) {
            return $notification->metadata['chat_id'];
        }

        // For tenant-related notifications, try to get from tenant metadata
        if ($notification->metadata) {
            if (! empty($notification->metadata['tenant_id'])) {
                $tenant = Tenant::find($notification->metadata['tenant_id']);
                // Note: If you add telegram_chat_id to tenants table, uncomment below
                // if ($tenant && !empty($tenant->telegram_chat_id)) {
                //     return $tenant->telegram_chat_id;
                // }
            }
        }

        // For system notifications or when no specific chat_id, return null
        // TelegramNotificationService will use default chat_id from settings
        return null;
    }
}

