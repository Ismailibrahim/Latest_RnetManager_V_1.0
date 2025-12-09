<?php

namespace App\Constants;

/**
 * API-related constants
 */
class ApiConstants
{
    /**
     * Default pagination values
     */
    public const DEFAULT_PER_PAGE = 15;
    public const MAX_PER_PAGE = 100;
    public const ADMIN_DEFAULT_PER_PAGE = 50;
    public const ADMIN_MAX_PER_PAGE = 1000;

    /**
     * Rate limiting values (requests per minute)
     */
    public const RATE_LIMIT_DEFAULT = 60;
    public const RATE_LIMIT_AUTH = 10;
    public const RATE_LIMIT_LISTING = 120;
    public const RATE_LIMIT_MODIFICATION = 30;
    public const RATE_LIMIT_DESTRUCTIVE = 20;
    public const RATE_LIMIT_BULK_OPERATIONS = 6;

    /**
     * Subscription defaults
     */
    public const DEFAULT_SUBSCRIPTION_MONTHS = 1;
    public const SUBSCRIPTION_EXTEND_DEFAULT_MONTHS = 1;

    /**
     * CORS settings
     */
    public const CORS_MAX_AGE = 86400; // 24 hours in seconds

    /**
     * File upload limits (in KB)
     */
    public const DEFAULT_FILE_MAX_KB = 20480; // 20MB

    /**
     * Recent activity defaults
     */
    public const RECENT_ACTIVITY_DAYS = 30;
    public const RECENT_ACTIVITY_LIMIT = 20;

    /**
     * Lease expiration defaults
     */
    public const LEASE_EXPIRING_SOON_DAYS = 30;
    public const LEASE_EXPIRING_UPCOMING_DAYS = 90;
}

