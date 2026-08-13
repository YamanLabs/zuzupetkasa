# build-release-v161.ps1
# V1.6.1 build + release script (includes BOTH arm64 unpacked and x64/arm64 .exe for older clients)
# Calistirmak icin: .\build-release-v161.ps1

$ErrorActionPreference = "Stop"
$version = "1.6.1"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ZUZU PET Kasa POS - v$version Build" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Next.js build
Write-Host "[1/3] Next.js build basliyor..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { throw "Next.js build basarisiz!" }
Write-Host "  Next.js build tamamlandi." -ForegroundColor Green

# 2. Electron build (.exe ve unpacked)
Write-Host ""
Write-Host "[2/3] Electron build basliyor (unpacked arm64 & portable x64/arm64)..." -ForegroundColor Yellow

# Github baglanti kopmasini onlemek icin ayna kullan
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
$env:ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/"

# Unpacked arm64 build for .asar
Write-Host "  -> Unpacked (asar) build..." -ForegroundColor Cyan
npx electron-builder --dir --arm64
if ($LASTEXITCODE -ne 0) { throw "Electron unpacked build basarisiz!" }

# Portable .exe build for older clients
Write-Host "  -> Portable exe build..." -ForegroundColor Cyan
npx electron-builder --win portable --x64 --arm64
if ($LASTEXITCODE -ne 0) { throw "Electron portable build basarisiz!" }

Write-Host "  Electron build tamamlandi." -ForegroundColor Green

# 3. Dosyalari release klasorune kopyala
Write-Host ""
Write-Host "[3/3] Dosyalar release klasorune hazirlaniyor..." -ForegroundColor Yellow

$releaseDir = "dist\release-v$version"
if (-not (Test-Path $releaseDir)) {
    New-Item -ItemType Directory -Path $releaseDir | Out-Null
}

# Asar dosyasini kopyala
$asarSrc  = "dist\win-arm64-unpacked\resources\app.asar"
$asarDest = "$releaseDir\app-arm64.asar"
Copy-Item -Path $asarSrc -Destination $asarDest -Force
$asarSizeMB = [math]::Round((Get-Item $asarDest).Length / 1MB, 1)
Write-Host "  -> app-arm64.asar kopyalandi: $asarDest ($asarSizeMB MB)" -ForegroundColor Green

# Exe dosyalarini kopyala
$exeSrcX64 = "dist\ZUZU_PET_Kasa_POS_x64.exe"
if (Test-Path $exeSrcX64) {
    $exeDestX64 = "$releaseDir\ZUZU_PET_Kasa_POS_x64.exe"
    Copy-Item -Path $exeSrcX64 -Destination $exeDestX64 -Force
    $exeSizeMB = [math]::Round((Get-Item $exeDestX64).Length / 1MB, 1)
    Write-Host "  -> ZUZU_PET_Kasa_POS_x64.exe kopyalandi ($exeSizeMB MB)" -ForegroundColor Green
}

$exeSrcArm64 = "dist\ZUZU_PET_Kasa_POS_arm64.exe"
if (Test-Path $exeSrcArm64) {
    $exeDestArm64 = "$releaseDir\ZUZU_PET_Kasa_POS_arm64.exe"
    Copy-Item -Path $exeSrcArm64 -Destination $exeDestArm64 -Force
    $exeSizeMB = [math]::Round((Get-Item $exeDestArm64).Length / 1MB, 1)
    Write-Host "  -> ZUZU_PET_Kasa_POS_arm64.exe kopyalandi ($exeSizeMB MB)" -ForegroundColor Green
}

# Ozet
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BUILD TAMAMLANDI!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Release edilecek dosyalar (Klasor: $(Resolve-Path $releaseDir)):" -ForegroundColor White
Write-Host "  - app-arm64.asar (1.6.0 ve uzeri yeni istemciler icin)" -ForegroundColor Yellow
Write-Host "  - ZUZU_PET_Kasa_POS_x64.exe (1.5.0 ve alti eski istemciler icin)" -ForegroundColor Yellow
Write-Host "  - ZUZU_PET_Kasa_POS_arm64.exe" -ForegroundColor Yellow
Write-Host ""
Write-Host "  SONRAKI ADIMLAR:" -ForegroundColor White
Write-Host "  1. GitHub'da v$version release olustur (tag: v$version - kucuk v ile)" -ForegroundColor Gray
Write-Host "  2. Bu klasordeki TUM dosyalari release asset olarak yukle" -ForegroundColor Gray
Write-Host "  3. Release'i publish et" -ForegroundColor Gray
Write-Host ""
