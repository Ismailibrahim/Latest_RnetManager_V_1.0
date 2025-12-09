<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class PromoteToSuperAdmin extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'user:promote-super-admin 
                            {email : User email address}
                            {--force : Force promotion even if user already has a landlord}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Promote an existing user to super admin role';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $email = $this->argument('email');
        $force = $this->option('force');

        // Find the user
        $user = User::where('email', $email)->first();

        if (!$user) {
            $this->error("User with email '{$email}' not found.");
            return 1;
        }

        // Check if already super admin
        if ($user->isSuperAdmin()) {
            $this->info("User '{$email}' is already a super admin.");
            return 0;
        }

        // Check if user has a landlord_id (unless force is used)
        if ($user->landlord_id && !$force) {
            $this->warn("User '{$email}' is currently associated with landlord ID: {$user->landlord_id}");
            $this->warn("Promoting to super admin will remove this association.");
            
            if (!$this->confirm('Do you want to continue?', false)) {
                $this->info('Operation cancelled.');
                return 0;
            }
        }

        // Promote to super admin
        try {
            $user->update([
                'role' => User::ROLE_SUPER_ADMIN,
                'landlord_id' => null, // Super admins don't have landlord_id
            ]);

            $this->info("✓ User '{$email}' has been promoted to super admin!");
            $this->line("  Name: {$user->full_name}");
            $this->line("  Email: {$user->email}");
            $this->line("  Role: {$user->role}");
            $this->line("  Landlord ID: N/A (Super Admin)");

            return 0;
        } catch (\Exception $e) {
            $this->error("Failed to promote user: " . $e->getMessage());
            return 1;
        }
    }
}
