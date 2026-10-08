<#
  เทสต์ตัวกันพลาดของ code/scripts/db/backup-restore.ps1 (ไม่ต้องใช้ฐานข้อมูลหรือ PostgreSQL client)
  รัน: pwsh -NoProfile -File test/scripts/backup-restore.Tests.ps1   (หรือ powershell -File บน Windows)
  จบด้วย exit code 1 ถ้ามีเคสไม่ผ่าน
#>
$ErrorActionPreference = 'Stop'
$scriptPath = (Resolve-Path (Join-Path $PSScriptRoot '../../code/scripts/db/backup-restore.ps1')).Path

# dot-source เพื่อโหลดฟังก์ชันเท่านั้น สคริปต์จะไม่รันคำสั่ง backup/restore/verify
. $scriptPath

$script:failures = 0
$secret = 'S3cretPassw0rd'

function Test-Case([string]$Name, [scriptblock]$Body) {
    try {
        & $Body
        Write-Host "PASS  $Name"
    } catch {
        $script:failures++
        Write-Host "FAIL  $Name -> $($_.Exception.Message)"
    }
}

function Assert-Throws([scriptblock]$Body, [string]$ExpectedText) {
    $message = $null
    try { & $Body } catch { $message = $_.Exception.Message }
    if ($null -eq $message) { throw 'คาดว่าจะ throw แต่ไม่ throw' }
    if ($message -notlike "*$ExpectedText*") { throw "ข้อความไม่ตรง: $message" }
    if ($message -like "*$secret*") { throw 'ข้อความ error มีรหัสผ่านหลุดออกมา' }
}

function Url([string]$HostName, [string]$Database) {
    return "postgresql://neondb_owner:$secret@$HostName/$Database`?sslmode=require&channel_binding=require"
}

$directHost = 'ep-sample-123.ap-southeast-1.aws.neon.tech'
$poolerHost = 'ep-sample-123-pooler.ap-southeast-1.aws.neon.tech'

Test-Case 'restore ไม่ได้ตั้ง COURSEHUB_SOURCE_DB_URL ต้องหยุดก่อนแตะฐานปลายทาง' {
    $env:COURSEHUB_SOURCE_DB_URL = $null
    $env:COURSEHUB_RESTORE_DB_URL = Url $directHost 'coursehub_restore'
    $shell = (Get-Process -Id $PID).Path
    # Windows PowerShell 5.1 จะหยุดทันทีเมื่อโปรแกรมลูกเขียน stderr ถ้า ErrorActionPreference เป็น Stop
    # จึงเปลี่ยนเป็น Continue ชั่วคราวเพื่อเก็บข้อความ error มาตรวจ
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $output = & $shell -NoProfile -ExecutionPolicy Bypass -File $scriptPath restore -DumpFile 'missing.dump' 2>&1 | Out-String
        $exitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousPreference
    }
    $env:COURSEHUB_RESTORE_DB_URL = $null
    if ($exitCode -eq 0) { throw 'สคริปต์ควรจบด้วย exit code ที่ไม่ใช่ 0' }
    if ($output -notlike '*COURSEHUB_SOURCE_DB_URL*') { throw "ไม่ได้แจ้งว่าขาด COURSEHUB_SOURCE_DB_URL: $output" }
    if ($output -like "*$secret*") { throw 'ข้อความ error มีรหัสผ่านหลุดออกมา' }
}

Test-Case 'ปฏิเสธปลายทาง neondb ผ่าน host แบบ pooler แม้ host ต่างจากต้นทาง' {
    Assert-Throws { Assert-SafeRestoreTarget (Url $directHost 'neondb') (Url $poolerHost 'neondb') @('neondb') } "'neondb'"
}

Test-Case 'ปฏิเสธปลายทาง neondb แม้ต้นทางเป็นฐานอื่น (กันจากรายชื่อฐาน production)' {
    Assert-Throws { Assert-SafeRestoreTarget (Url $directHost 'coursehub_staging') (Url $directHost 'neondb') @('neondb') } 'production'
}

Test-Case 'ปฏิเสธชื่อฐาน production โดยไม่สนตัวพิมพ์เล็กใหญ่' {
    Assert-Throws { Assert-SafeRestoreTarget (Url $directHost 'coursehub_staging') (Url $directHost 'NeonDB') @('neondb') } 'production'
}

Test-Case 'ปฏิเสธปลายทางที่ชื่อเดียวกับต้นทางผ่าน host pooler (ฐานที่ไม่อยู่ในรายชื่อ)' {
    Assert-Throws { Assert-SafeRestoreTarget (Url $directHost 'appdb') (Url $poolerHost 'appdb') @('neondb') } 'ชื่อเดียวกับต้นทาง'
}

Test-Case 'ปฏิเสธปลายทางที่ไม่ระบุชื่อ database' {
    Assert-Throws { Assert-SafeRestoreTarget (Url $directHost 'neondb') "postgresql://u:$secret@$directHost/" @('neondb') } 'ชื่อ database'
}

Test-Case 'ยอมให้ restore ลง coursehub_restore ซึ่งเป็นฐานแยก' {
    Assert-SafeRestoreTarget (Url $directHost 'neondb') (Url $directHost 'coursehub_restore') @('neondb')
}

Test-Case 'ปฏิเสธ connection string แบบ JDBC โดยไม่พิมพ์รหัสผ่าน' {
    $env:COURSEHUB_TEST_DB_URL = "jdbc:postgresql://$directHost/neondb?user=neondb_owner&password=$secret"
    try { Assert-Throws { Get-DbUrl 'COURSEHUB_TEST_DB_URL' } 'JDBC' } finally { $env:COURSEHUB_TEST_DB_URL = $null }
}

if ($script:failures -gt 0) {
    Write-Host "ไม่ผ่าน $($script:failures) เคส"
    exit 1
}
Write-Host 'ผ่านทุกเคส'
