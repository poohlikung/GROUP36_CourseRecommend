<#
.SYNOPSIS
  Backup ฐานข้อมูล CourseHub (Neon) ด้วย pg_dump, restore ลงฐานทดสอบ และเทียบจำนวนแถว

.DESCRIPTION
  ต้องมี PostgreSQL client tools (pg_dump, pg_restore, psql) ใน PATH และเวอร์ชันต้องไม่ต่ำกว่าเวอร์ชันของ server
  connection string อ่านจาก environment variable เท่านั้น สคริปต์ไม่พิมพ์ URL หรือรหัสผ่านออกหน้าจอ

    COURSEHUB_SOURCE_DB_URL   ฐานต้นทาง (production บน Neon)  ใช้กับ backup และ verify
    COURSEHUB_RESTORE_DB_URL  ฐานทดสอบที่ว่างเปล่า            ใช้กับ restore และ verify

  ขั้นตอนเต็มอยู่ใน doc/task24-backup-restore-guide.md

.EXAMPLE
  .\code\scripts\db\backup-restore.ps1 backup
  .\code\scripts\db\backup-restore.ps1 restore -DumpFile backups\coursehub-20261008-210000.dump
  .\code\scripts\db\backup-restore.ps1 verify
#>
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [ValidateSet('backup', 'restore', 'verify')]
    [string]$Action,

    [string]$DumpFile,

    [string]$BackupDir = 'backups'
)

$ErrorActionPreference = 'Stop'

# นับแถวจริงทุกตารางใน schema public (SQL เดียวกับ BackupRestoreRehearsalIntegrationTests)
$RowCountSql = @"
SELECT table_name,
       (xpath('/row/c/text()', query_to_xml(
           format('SELECT count(*) AS c FROM %I.%I', table_schema, table_name),
           false, true, '')))[1]::text::bigint
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name
"@

$FlywayHistorySql = 'SELECT version, checksum, success FROM flyway_schema_history ORDER BY installed_rank'

function Require-Tool([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "ไม่พบ $Name ใน PATH ให้ติดตั้ง PostgreSQL client tools ตาม doc/task24-backup-restore-guide.md"
    }
}

function Get-DbUrl([string]$VariableName) {
    $value = [Environment]::GetEnvironmentVariable($VariableName)
    if ([string]::IsNullOrWhiteSpace($value)) {
        throw "ยังไม่ได้ตั้ง environment variable $VariableName"
    }
    # ตรวจรูปแบบก่อนส่งให้ psql เพื่อไม่ให้ error ของ psql พิมพ์ connection string (และรหัสผ่าน) ออกหน้าจอ
    if ($value -match '^\s*jdbc:') {
        throw "$VariableName เป็นรูปแบบ JDBC (jdbc:postgresql://...) ซึ่ง psql/pg_dump ใช้ไม่ได้ ให้คัดลอกแบบ Connection string ที่ขึ้นต้นด้วย postgresql:// จากปุ่ม Connect ของ Neon"
    }
    if ($value -notmatch '^\s*postgres(ql)?://') {
        throw "$VariableName ต้องขึ้นต้นด้วย postgresql://"
    }
    return $value.Trim()
}

# ชื่อ host/database สำหรับแสดงผลและตรวจความปลอดภัย โดยไม่เปิดเผย user/password
function Get-DbTarget([string]$Url) {
    $uri = [System.Uri]$Url
    return '{0}/{1}' -f $uri.Host, $uri.AbsolutePath.TrimStart('/')
}

function Invoke-Psql([string]$Url, [string]$Sql) {
    $output = & psql --no-psqlrc --quiet --tuples-only --no-align '--field-separator=|' "--dbname=$Url" "--command=$Sql"
    if ($LASTEXITCODE -ne 0) { throw "psql ทำงานไม่สำเร็จ (exit $LASTEXITCODE)" }
    # คืนเป็น array เสมอ (ถ้ามีบรรทัดเดียว PowerShell จะคลายเป็น string แล้ว [0] ได้ตัวอักษรแรกแทน)
    return ,@($output | Where-Object { $_ -ne '' })
}

function Get-RowCounts([string]$Url) {
    $rows = @{}
    $lines = Invoke-Psql $Url $RowCountSql
    foreach ($line in $lines) {
        $parts = $line.Split('|')
        $rows[$parts[0]] = $parts[1]
    }
    return $rows
}

function Assert-ClientVersion([string]$Url) {
    $versionNum = [int](Invoke-Psql $Url 'SHOW server_version_num')[0]
    $serverMajor = [int][math]::Floor($versionNum / 10000)
    $clientText = (& pg_dump --version) -join ' '
    $clientMajor = [int]([regex]::Match($clientText, '(\d+)\.').Groups[1].Value)
    Write-Host "PostgreSQL server $serverMajor / client $clientMajor"
    if ($clientMajor -lt $serverMajor) {
        throw "pg_dump เวอร์ชัน $clientMajor ต่ำกว่า server เวอร์ชัน $serverMajor ให้ติดตั้ง client เวอร์ชัน $serverMajor ขึ้นไป"
    }
}

function Invoke-Backup {
    Require-Tool 'pg_dump'
    Require-Tool 'psql'
    $source = Get-DbUrl 'COURSEHUB_SOURCE_DB_URL'
    Assert-ClientVersion $source

    New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
    $file = Join-Path $BackupDir ('coursehub-{0}.dump' -f (Get-Date -Format 'yyyyMMdd-HHmmss'))

    Write-Host "Backup จาก $(Get-DbTarget $source) ..."
    & pg_dump --format=custom --no-owner --no-acl "--file=$file" "--dbname=$source"
    if ($LASTEXITCODE -ne 0) { throw "pg_dump ไม่สำเร็จ (exit $LASTEXITCODE)" }

    $hash = (Get-FileHash -Algorithm SHA256 -Path $file).Hash
    $size = (Get-Item $file).Length
    Write-Host "สำเร็จ: $file ($size bytes)"
    Write-Host "SHA256: $hash"
}

function Invoke-Restore {
    Require-Tool 'pg_restore'
    Require-Tool 'psql'
    if ([string]::IsNullOrWhiteSpace($DumpFile) -or -not (Test-Path $DumpFile)) {
        throw 'ระบุไฟล์ backup ด้วย -DumpFile <path ของไฟล์ .dump>'
    }
    $target = Get-DbUrl 'COURSEHUB_RESTORE_DB_URL'
    $sourceUrl = [Environment]::GetEnvironmentVariable('COURSEHUB_SOURCE_DB_URL')

    # กันพลาด restore ทับฐาน production
    if (-not [string]::IsNullOrWhiteSpace($sourceUrl) -and (Get-DbTarget $sourceUrl) -eq (Get-DbTarget $target)) {
        throw 'COURSEHUB_RESTORE_DB_URL ชี้ไปฐานเดียวกับต้นทาง ห้าม restore ทับฐาน production'
    }
    $tableLines = Invoke-Psql $target "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'"
    $tableCount = [int]$tableLines[0]
    if ($tableCount -gt 0) {
        throw "ฐานปลายทาง $(Get-DbTarget $target) มี $tableCount ตารางอยู่แล้ว ให้ใช้ฐานว่างเท่านั้น"
    }
    Assert-ClientVersion $target

    Write-Host "Restore $DumpFile ลง $(Get-DbTarget $target) ..."
    & pg_restore --no-owner --no-acl --exit-on-error "--dbname=$target" $DumpFile
    if ($LASTEXITCODE -ne 0) { throw "pg_restore ไม่สำเร็จ (exit $LASTEXITCODE)" }
    Write-Host 'Restore สำเร็จ ต่อด้วยคำสั่ง verify เพื่อเทียบข้อมูล'
}

function Invoke-Verify {
    Require-Tool 'psql'
    $source = Get-DbUrl 'COURSEHUB_SOURCE_DB_URL'
    $target = Get-DbUrl 'COURSEHUB_RESTORE_DB_URL'

    $sourceRows = Get-RowCounts $source
    $targetRows = Get-RowCounts $target

    $mismatch = 0
    $tables = @($sourceRows.Keys) + @($targetRows.Keys) | Sort-Object -Unique
    $report = foreach ($table in $tables) {
        $same = $sourceRows[$table] -eq $targetRows[$table]
        if (-not $same) { $mismatch++ }
        [pscustomobject]@{ Table = $table; Source = $sourceRows[$table]; Restored = $targetRows[$table]; Match = $same }
    }
    Write-Host ($report | Format-Table -AutoSize | Out-String -Width 200)

    $sourceHistory = Invoke-Psql $source $FlywayHistorySql
    $targetHistory = Invoke-Psql $target $FlywayHistorySql
    $historySame = ($sourceHistory -join "`n") -eq ($targetHistory -join "`n")
    Write-Host "ต้นทาง: $(Get-DbTarget $source)"
    Write-Host "ปลายทาง: $(Get-DbTarget $target)"
    Write-Host "Flyway history ตรงกัน: $historySame"

    if ($mismatch -gt 0 -or -not $historySame) {
        Write-Host "ไม่ผ่าน: จำนวนแถวไม่ตรง $mismatch ตาราง" -ForegroundColor Red
        exit 1
    }
    Write-Host "ผ่าน: ข้อมูลครบทั้ง $($report.Count) ตาราง" -ForegroundColor Green
}

switch ($Action) {
    'backup' { Invoke-Backup }
    'restore' { Invoke-Restore }
    'verify' { Invoke-Verify }
}
