@echo off
cd /d "%~dp0"
if exist "desktop-dist\上限仕入れ額計算機.exe" (
  start "" "desktop-dist\上限仕入れ額計算機.exe"
) else (
  npm run dev
)
