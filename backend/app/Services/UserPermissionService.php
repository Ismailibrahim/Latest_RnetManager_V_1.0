<?php

namespace App\Services;

use App\Models\User;

class UserPermissionService
{
    /**
     * Get default permissions for a role.
     *
     * @param  string  $role
     * @return array<string, array<string, bool>>
     */
    public function getRolePermissions(string $role): array
    {
        return match ($role) {
            User::ROLE_OWNER => $this->getOwnerPermissions(),
            User::ROLE_ADMIN => $this->getAdminPermissions(),
            User::ROLE_MANAGER => $this->getManagerPermissions(),
            User::ROLE_AGENT => $this->getAgentPermissions(),
            User::ROLE_SUPER_ADMIN => $this->getSuperAdminPermissions(),
            default => [],
        };
    }

    /**
     * Get all permissions for a user (role-based for now, can extend with granular later).
     *
     * @param  User  $user
     * @return array<string, array<string, bool>>
     */
    public function getUserPermissions(User $user): array
    {
        return $this->getRolePermissions($user->role);
    }

    /**
     * Check if user can perform an action on a resource.
     *
     * @param  User  $user
     * @param  string  $resource
     * @param  string  $action
     * @return bool
     */
    public function canUserPerform(User $user, string $resource, string $action): bool
    {
        $permissions = $this->getUserPermissions($user);
        
        return $permissions[$resource][$action] ?? false;
    }

    /**
     * Get complete permission matrix for all roles.
     *
     * @return array<string, array<string, array<string, bool>>>
     */
    public function getPermissionMatrix(): array
    {
        return [
            User::ROLE_OWNER => $this->getOwnerPermissions(),
            User::ROLE_ADMIN => $this->getAdminPermissions(),
            User::ROLE_MANAGER => $this->getManagerPermissions(),
            User::ROLE_AGENT => $this->getAgentPermissions(),
            User::ROLE_SUPER_ADMIN => $this->getSuperAdminPermissions(),
        ];
    }

    /**
     * Get all available resources and actions.
     *
     * @return array<string, array<string>>
     */
    public function getResources(): array
    {
        return [
            'properties' => ['view', 'create', 'edit', 'delete'],
            'units' => ['view', 'create', 'edit', 'delete'],
            'tenants' => ['view', 'create', 'edit', 'delete'],
            'tenant_units' => ['view', 'create', 'edit', 'delete'],
            'invoices' => ['view', 'create', 'edit', 'delete'],
            'rent_invoices' => ['view', 'create', 'edit', 'delete'],
            'maintenance_invoices' => ['view', 'create', 'edit', 'delete'],
            'maintenance_requests' => ['view', 'create', 'edit', 'delete'],
            'payments' => ['view', 'create', 'edit', 'delete'],
            'reports' => ['view', 'export'],
            'financial_records' => ['view', 'create', 'edit', 'delete'],
            'settings' => ['view', 'edit'],
            'users' => ['view', 'create', 'edit', 'delete', 'manage_roles'],
            'assets' => ['view', 'create', 'edit', 'delete'],
            'vendors' => ['view', 'create', 'edit', 'delete'],
        ];
    }

    /**
     * Get permissions for Owner role (full access).
     *
     * @return array<string, array<string, bool>>
     */
    protected function getOwnerPermissions(): array
    {
        $resources = $this->getResources();
        $permissions = [];

        foreach ($resources as $resource => $actions) {
            foreach ($actions as $action) {
                $permissions[$resource][$action] = true;
            }
        }

        return $permissions;
    }

    /**
     * Get permissions for Admin role.
     *
     * @return array<string, array<string, bool>>
     */
    protected function getAdminPermissions(): array
    {
        $resources = $this->getResources();
        $permissions = [];

        foreach ($resources as $resource => $actions) {
            foreach ($actions as $action) {
                // Admins have full access except they cannot delete critical data
                if ($resource === 'properties' && $action === 'delete') {
                    $permissions[$resource][$action] = false;
                } elseif ($resource === 'users' && $action === 'manage_roles') {
                    // Admins can manage users but not assign super_admin role
                    $permissions[$resource][$action] = true;
                } else {
                    $permissions[$resource][$action] = true;
                }
            }
        }

        return $permissions;
    }

    /**
     * Get permissions for Manager role.
     *
     * @return array<string, array<string, bool>>
     */
    protected function getManagerPermissions(): array
    {
        return [
            'properties' => ['view' => true, 'create' => true, 'edit' => true, 'delete' => false],
            'units' => ['view' => true, 'create' => true, 'edit' => true, 'delete' => false],
            'tenants' => ['view' => true, 'create' => true, 'edit' => true, 'delete' => false],
            'tenant_units' => ['view' => true, 'create' => true, 'edit' => true, 'delete' => false],
            'invoices' => ['view' => true, 'create' => true, 'edit' => true, 'delete' => false],
            'rent_invoices' => ['view' => true, 'create' => true, 'edit' => true, 'delete' => false],
            'maintenance_invoices' => ['view' => true, 'create' => true, 'edit' => true, 'delete' => false],
            'maintenance_requests' => ['view' => true, 'create' => true, 'edit' => true, 'delete' => false],
            'payments' => ['view' => true, 'create' => true, 'edit' => true, 'delete' => false],
            'reports' => ['view' => true, 'export' => true],
            'financial_records' => ['view' => true, 'create' => true, 'edit' => true, 'delete' => false],
            'settings' => ['view' => false, 'edit' => false],
            'users' => ['view' => true, 'create' => false, 'edit' => false, 'delete' => false, 'manage_roles' => false],
            'assets' => ['view' => true, 'create' => true, 'edit' => true, 'delete' => false],
            'vendors' => ['view' => true, 'create' => true, 'edit' => true, 'delete' => false],
        ];
    }

    /**
     * Get permissions for Agent role.
     *
     * @return array<string, array<string, bool>>
     */
    protected function getAgentPermissions(): array
    {
        return [
            'properties' => ['view' => true, 'create' => false, 'edit' => false, 'delete' => false],
            'units' => ['view' => true, 'create' => false, 'edit' => false, 'delete' => false],
            'tenants' => ['view' => true, 'create' => false, 'edit' => false, 'delete' => false],
            'tenant_units' => ['view' => true, 'create' => true, 'edit' => true, 'delete' => false],
            'invoices' => ['view' => false, 'create' => false, 'edit' => false, 'delete' => false],
            'rent_invoices' => ['view' => false, 'create' => false, 'edit' => false, 'delete' => false],
            'maintenance_invoices' => ['view' => false, 'create' => false, 'edit' => false, 'delete' => false],
            'maintenance_requests' => ['view' => true, 'create' => true, 'edit' => true, 'delete' => false],
            'payments' => ['view' => false, 'create' => false, 'edit' => false, 'delete' => false],
            'reports' => ['view' => false, 'export' => false],
            'financial_records' => ['view' => false, 'create' => false, 'edit' => false, 'delete' => false],
            'settings' => ['view' => false, 'edit' => false],
            'users' => ['view' => false, 'create' => false, 'edit' => false, 'delete' => false, 'manage_roles' => false],
            'assets' => ['view' => true, 'create' => false, 'edit' => false, 'delete' => false],
            'vendors' => ['view' => true, 'create' => false, 'edit' => false, 'delete' => false],
        ];
    }

    /**
     * Get permissions for Super Admin role (full system access).
     *
     * @return array<string, array<string, bool>>
     */
    protected function getSuperAdminPermissions(): array
    {
        $resources = $this->getResources();
        $permissions = [];

        foreach ($resources as $resource => $actions) {
            foreach ($actions as $action) {
                $permissions[$resource][$action] = true;
            }
        }

        // Super admins also have access to admin features
        $permissions['admin'] = ['view' => true, 'manage' => true];
        $permissions['signups'] = ['view' => true, 'approve' => true, 'reject' => true];

        return $permissions;
    }
}
