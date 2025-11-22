# Consolidate Directories Guide

You have two directories for the same project:
- `D:\Sandbox\Rent_V2` (workspace - has git repo)
- `C:\laragon\www\Rent_V2` (Laragon directory)

## Option 1: Use D:\Sandbox\Rent_V2 as Main (Recommended)

This is the workspace with the git repository, so it's the source of truth.

### Steps:

1. **Check if C:\laragon\www\Rent_V2 is a copy or symlink:**
   ```powershell
   # In PowerShell, check if it's a junction/symlink
   Get-Item "C:\laragon\www\Rent_V2" | Select-Object Target
   ```

2. **If C:\laragon\www\Rent_V2 is just a copy:**
   - Delete it: `Remove-Item -Recurse -Force "C:\laragon\www\Rent_V2"`
   - Create a symlink/junction pointing to D:\Sandbox\Rent_V2:
     ```powershell
     # Run PowerShell as Administrator
     New-Item -ItemType Junction -Path "C:\laragon\www\Rent_V2" -Target "D:\Sandbox\Rent_V2"
     ```

3. **If C:\laragon\www\Rent_V2 has important changes:**
   - First, copy any unique files from C:\ to D:\
   - Then follow step 2

4. **Update Cursor workspace:**
   - Open Cursor
   - File → Open Folder → Select `D:\Sandbox\Rent_V2`
   - This will be your main workspace

## Option 2: Move Everything to C:\laragon\www\Rent_V2

If you prefer to work in Laragon's directory:

1. **Backup D:\Sandbox\Rent_V2 first!**

2. **Copy everything from D:\Sandbox\Rent_V2 to C:\laragon\www\Rent_V2:**
   ```powershell
   # Make sure C:\laragon\www\Rent_V2 is empty or backed up
   Copy-Item -Recurse -Force "D:\Sandbox\Rent_V2\*" "C:\laragon\www\Rent_V2\"
   ```

3. **Update git remote if needed:**
   ```powershell
   cd C:\laragon\www\Rent_V2
   git remote -v  # Verify remote is correct
   ```

4. **Update Cursor workspace:**
   - File → Open Folder → Select `C:\laragon\www\Rent_V2`

## Option 3: Keep Both, Use Git to Sync

If you need both directories:

1. **Set D:\Sandbox\Rent_V2 as your main git repo**

2. **Make C:\laragon\www\Rent_V2 a git clone:**
   ```powershell
   # Delete C:\laragon\www\Rent_V2 if it exists
   Remove-Item -Recurse -Force "C:\laragon\www\Rent_V2"
   
   # Clone from D:\Sandbox\Rent_V2
   cd C:\laragon\www
   git clone "D:\Sandbox\Rent_V2" "Rent_V2"
   ```

3. **Always work in D:\Sandbox\Rent_V2, pull changes to C:\ when needed**

## Recommended: Option 1 (Symlink)

This keeps one source of truth and Laragon can access it via symlink.

### Quick Commands:

```powershell
# Run as Administrator
# 1. Check what's in Laragon directory
Get-ChildItem "C:\laragon\www\Rent_V2" | Select-Object Name, LastWriteTime

# 2. If safe to delete, create symlink
Remove-Item -Recurse -Force "C:\laragon\www\Rent_V2"
New-Item -ItemType Junction -Path "C:\laragon\www\Rent_V2" -Target "D:\Sandbox\Rent_V2"

# 3. Verify it works
Test-Path "C:\laragon\www\Rent_V2\backend"
```

## After Consolidation

1. **Update Cursor workspace to point to the main directory**
2. **Verify git is working:**
   ```powershell
   cd D:\Sandbox\Rent_V2  # or C:\laragon\www\Rent_V2 if you chose Option 2
   git status
   ```

3. **Test Laragon can access the backend:**
   ```powershell
   cd C:\laragon\www\Rent_V2\backend
   php artisan --version
   ```

