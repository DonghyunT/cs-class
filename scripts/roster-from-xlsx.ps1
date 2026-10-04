param(
    [Parameter(Mandatory = $true)][string]$Source,
    [string]$Output = 'private/student-roster.csv'
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
$workspace = Split-Path $PSScriptRoot -Parent
$privateRoot = [IO.Path]::GetFullPath((Join-Path $workspace 'private'))
$target = [IO.Path]::GetFullPath($(if ([IO.Path]::IsPathRooted($Output)) { $Output } else { Join-Path $workspace $Output }))
if (!$target.StartsWith($privateRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Output must be inside the ignored private folder.' }
if (!(Test-Path -LiteralPath $privateRoot)) { [IO.Directory]::CreateDirectory($privateRoot) | Out-Null }
$directory = [IO.DirectoryInfo](Split-Path $target -Parent)
if (!$directory.Exists) { throw 'Create the private output directory first.' }
for ($current = $directory; $current -and $current.FullName.StartsWith($privateRoot, [StringComparison]::OrdinalIgnoreCase); $current = $current.Parent) {
    if ($current.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Private output directories must not redirect elsewhere.' }
}
$zip = [IO.Compression.ZipFile]::OpenRead((Resolve-Path -LiteralPath $Source).Path)
function Read-XmlEntry([string]$name, [bool]$optional = $false) {
    $entry = $zip.GetEntry($name)
    if (!$entry) { if ($optional) { return $null }; throw 'Required workbook part missing.' }
    if ($entry.Length -gt 10MB) { throw 'Workbook part too large.' }
    $stream = $entry.Open()
    $settings = [Xml.XmlReaderSettings]::new()
    $settings.DtdProcessing = [Xml.DtdProcessing]::Prohibit
    $settings.XmlResolver = $null
    $settings.MaxCharactersInDocument = 10MB
    $reader = [Xml.XmlReader]::Create($stream, $settings)
    try { $document = [Xml.XmlDocument]::new(); $document.XmlResolver = $null; $document.Load($reader); return ,$document }
    finally { $reader.Dispose(); $stream.Dispose() }
}
try {
    $sharedXml = Read-XmlEntry 'xl/sharedStrings.xml' $true
    $shared = @()
    if ($sharedXml) { $shared = @($sharedXml.SelectNodes('//*[local-name()="si"]') | ForEach-Object { ($_.SelectNodes('.//*[local-name()="t"]') | ForEach-Object { $_.InnerText }) -join '' }) }
    $workbook = Read-XmlEntry 'xl/workbook.xml'
    $relationships = Read-XmlEntry 'xl/_rels/workbook.xml.rels'
    $csv = [Collections.Generic.List[string]]::new()
    $csv.Add('학년,반,번호,학번')
    $seen = [Collections.Generic.HashSet[string]]::new()
    $classes = [Collections.Generic.HashSet[int]]::new()
    foreach ($sheet in $workbook.SelectNodes('//*[local-name()="sheet"]')) {
        if ($sheet.name -notmatch '^(?<class>[1-9]|10|11)반$') { throw 'Workbook must contain only 1반 through 11반 sheets.' }
        $classNumber = [int]$Matches['class']
        if (!$classes.Add($classNumber)) { throw 'Duplicate classroom sheet.' }
        $relationshipId = $sheet.GetAttribute('id', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships')
        $relationship = @($relationships.SelectNodes('//*[local-name()="Relationship"]') | Where-Object { $_.Id -eq $relationshipId })
        if ($relationship.Count -ne 1 -or $relationship[0].TargetMode -eq 'External') { throw 'Invalid worksheet relationship.' }
        $part = $relationship[0].Target.TrimStart('/')
        if (!$part.StartsWith('xl/')) { $part = 'xl/' + $part }
        if ($part -notmatch '^xl/worksheets/[^/]+\.xml$') { throw 'Unexpected worksheet path.' }
        $sheetXml = Read-XmlEntry $part
        $headers = @{}
        $first = $true; $count = 0
        foreach ($row in $sheetXml.SelectNodes('//*[local-name()="sheetData"]/*[local-name()="row"]')) {
            $cells = @{}
            foreach ($cell in $row.SelectNodes('./*[local-name()="c"]')) {
                $column = $cell.r -replace '\d', ''
                $value = $cell.SelectSingleNode('./*[local-name()="v"]')
                if ($cell.t -eq 's' -and $value) { $cells[$column] = $shared[[int]$value.InnerText] }
                elseif ($cell.t -eq 'inlineStr') { $cells[$column] = ($cell.SelectNodes('.//*[local-name()="t"]') | ForEach-Object { $_.InnerText }) -join '' }
                else { $cells[$column] = if ($value) { $value.InnerText } else { '' } }
            }
            if ($first) {
                foreach ($column in $cells.Keys) { if ($cells[$column] -in '번호', '학번') { if ($headers.ContainsKey($cells[$column])) { throw 'Duplicate roster header.' }; $headers[$cells[$column]] = $column } }
                if (!$headers.ContainsKey('번호') -or !$headers.ContainsKey('학번')) { throw 'First row must contain 번호 and 학번.' }
                $first = $false; continue
            }
            $number = [string]$cells[$headers['번호']]; $studentId = [string]$cells[$headers['학번']]
            if (!$number -and !$studentId) { continue }
            if ($number -notmatch '^\d{1,2}$' -or [int]$number -lt 1 -or [int]$number -gt 27 -or $studentId -ne ('2{0:D2}{1:D2}' -f $classNumber, [int]$number) -or !$seen.Add($studentId)) { throw 'Invalid or duplicate student row. No output written.' }
            $csv.Add(('2,{0},{1},{2}' -f $classNumber, [int]$number, $studentId)); $count++
        }
        if ($first -or $count -eq 0 -or $count -gt 27) { throw 'Empty or oversized classroom sheet.' }
    }
    if ($classes.Count -ne 11) { throw 'All 11 classroom sheets are required.' }
    # CreateNew protects the original and any prior conversion. Names and the
    # legacy common-password column are never copied or printed.
    $file = [IO.File]::Open($target, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write)
    try { $writer = [IO.StreamWriter]::new($file, [Text.UTF8Encoding]::new($false)); $writer.Write(($csv -join "`r`n") + "`r`n"); $writer.Flush() }
    finally { if ($writer) { $writer.Dispose() }; $file.Dispose() }
    Write-Output ('Converted 11 classes, {0} rows. Names and old passwords excluded.' -f ($csv.Count - 1))
} finally { $zip.Dispose() }
