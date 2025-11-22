<?php

namespace App\Console\Commands;

use App\Models\Landlord;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class CreateUser extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'user:create 
                            {first_name : User first name}
                            {last_name : User last name}
                            {email : User email}
                            {password : User password}
                            {--mobile= : User mobile number}
                            {--role=owner : User role (owner, admin, manager, agent, super_admin)}
                            {--landlord_id= : Landlord ID (required unless role is super_admin)}
                            {--create-landlord : Create a new landlord if none exists}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create a new user account';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $firstName = $this->argument('first_name');
        $lastName = $this->argument('last_name');
        $email = $this->argument('email');
        $password = $this->argument('password');
        $mobile = $this->option('mobile') ?: '0000000000';
        $role = $this->option('role');
        $landlordId = $this->option('landlord_id');
        $createLandlord = $this->option('create-landlord');

        // Validate role
        if (!in_array($role, User::ROLES)) {
            $this->error("Invalid role. Must be one of: " . implode(', ', User::ROLES));
            return 1;
        }

        // Check if email already exists
        if (User::where('email', $email)->exists()) {
            $this->error("User with email {$email} already exists.");
            return 1;
        }

        // Handle landlord_id
        if ($role === User::ROLE_SUPER_ADMIN) {
            $landlordId = null; // Super admin doesn't need landlord_id
        } else {
            if (!$landlordId) {
                if ($createLandlord) {
                    // Create a new landlord
                    $landlord = Landlord::create([
                        'company_name' => "{$firstName} {$lastName} Properties",
                    ]);
                    $landlordId = $landlord->id;
                    $this->info("Created new landlord: {$landlord->company_name} (ID: {$landlordId})");
                } else {
                    // Try to get the first landlord
                    $landlord = Landlord::first();
                    if ($landlord) {
                        $landlordId = $landlord->id;
                        $this->info("Using existing landlord: {$landlord->company_name} (ID: {$landlordId})");
                    } else {
                        $this->error("No landlord found. Use --create-landlord to create one, or specify --landlord_id.");
                        return 1;
                    }
                }
            } else {
                // Validate landlord exists
                if (!Landlord::where('id', $landlordId)->exists()) {
                    $this->error("Landlord with ID {$landlordId} does not exist.");
                    return 1;
                }
            }
        }

        // Create the user
        try {
            $user = User::create([
                'landlord_id' => $landlordId,
                'first_name' => $firstName,
                'last_name' => $lastName,
                'email' => $email,
                'mobile' => $mobile,
                'password_hash' => $password, // Will be automatically hashed by the model
                'role' => $role,
                'is_active' => true,
                'email_verified_at' => now(),
            ]);

            $this->info("✓ User created successfully!");
            $this->line("  Name: {$user->full_name}");
            $this->line("  Email: {$user->email}");
            $this->line("  Role: {$user->role}");
            $this->line("  Landlord ID: " . ($user->landlord_id ?? 'N/A (Super Admin)'));

            return 0;
        } catch (\Exception $e) {
            $this->error("Failed to create user: " . $e->getMessage());
            return 1;
        }
    }
}
