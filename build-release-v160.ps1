# build-release-v160.ps1
# V1.6.0 arm64 unpacked update build + release script
# Calistirmak icin: .\build-release-v160.ps1

$ErrorActionPreference = "Stop"
$version = "1.6.0"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ZUZU PET Kasa POS - V$version Build" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Next.js build
Write-Host "[1/3] Next.js build basliyor..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { throw "Next.js build basarisiz!" }
Write-Host "  Next.js build tamamlandi." -ForegroundColor Green

# 2. Electron arm64 unpacked build
Write-Host ""
Write-Host "[2/3] Electron arm64 unpacked build basliyor..." -ForegroundColor Yellow
npx electron-builder --dir --arm64
if ($LASTEXITCODE -ne 0) { throw "Electron build basarisiz!" }
Write-Host "  Electron build tamamlandi." -ForegroundColor Green

# 3. app.asar'i release klasorune kopyala
Write-Host ""
Write-Host "[3/3] app.asar release icin hazirlaniyor..." -ForegroundColor Yellow

$asarSrc  = "dist\win-arm64-unpacked\resources\app.asar"
$releaseDir = "dist\release-v$version"
$asarDest = "$releaseDir\app-arm64.asar"

if (-not (Test-Path $releaseDir)) {
    New-Item -ItemType Directory -Path $releaseDir | Out-Null
}

Copy-Item -Path $asarSrc -Destination $asarDest -Force
$sizeMB = [math]::Round((Get-Item $asarDest).Length / 1MB, 1)
Write-Host "  app-arm64.asar kopyalandi: $asarDest ($sizeMB MB)" -ForegroundColor Green

# Ozet
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BUILD TAMAMLANDI!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Release edilecek dosya:" -ForegroundColor White
Write-Host "  --> $((Resolve-Path $asarDest).Path)" -ForegroundColor Yellow
Write-Host ""
Write-Host "  SONRAKI ADIMLAR:" -ForegroundColor White
Write-Host "  1. GitHub'da v$version release olustur (tag: v$version)" -ForegroundColor Gray
Write-Host "  2. app-arm64.asar dosyasini release asset olarak yukle" -ForegroundColor Gray
Write-Host "  3. Release'i publish et" -ForegroundColor Gray
Write-Host "  4. Musteri uygulamasinda 'Guncelleme Kontrol Et' tuslasun" -ForegroundColor Gray
Write-Host ""
