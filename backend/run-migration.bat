@echo off
echo Running document_templates migration...
cd /d "%~dp0"
php artisan migrate --path=database/migrations/2025_01_23_000000_create_document_templates_table.php --force
echo.
echo Running seeder...
php artisan db:seed --class=DocumentTemplateSeeder --force
echo.
echo Done! Press any key to exit...
pause >nul
