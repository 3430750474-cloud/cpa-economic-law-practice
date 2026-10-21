param(
  [string]$SourceZip = 'C:\Users\Cr\Desktop\经济法\轻1·基础细讲班-黄洁洵(笔记版word)(Word笔记版).zip',
  [string]$Output = "$PSScriptRoot\..\lib\authorized-questions.json"
)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip=[IO.Compression.ZipFile]::OpenRead($SourceZip)
$results=[Collections.Generic.List[object]]::new()
try {
  foreach($entry in $zip.Entries | Where-Object {$_.Name -match '^(0[1-9]|1[0-2]).*\.docx$'}) {
    $chapter=[regex]::Match($entry.Name,'^(\d{2})').Groups[1].Value
    $memory=[IO.MemoryStream]::new(); $stream=$entry.Open(); $stream.CopyTo($memory); $stream.Dispose(); $memory.Position=0
    $inner=[IO.Compression.ZipArchive]::new($memory,[IO.Compression.ZipArchiveMode]::Read)
    $doc=$inner.GetEntry('word/document.xml'); $reader=[IO.StreamReader]::new($doc.Open()); $xml=[xml]$reader.ReadToEnd(); $reader.Dispose()
    $ns=[Xml.XmlNamespaceManager]::new($xml.NameTable); $ns.AddNamespace('w','http://schemas.openxmlformats.org/wordprocessingml/2006/main')
    $paras=@($xml.SelectNodes('//w:p',$ns) | ForEach-Object { (($_.SelectNodes('.//w:t',$ns) | ForEach-Object {$_.InnerText}) -join '').Trim() } | Where-Object {$_})
    $inner.Dispose(); $memory.Dispose()
    for($i=0;$i -lt $paras.Count;$i++){
      $line=$paras[$i]
      if($line -notmatch '^经典真题\d+·(单选题|多选题).*?[　 ](.+)$'){continue}
      $kind=$matches[1]; $stem=$matches[2].Trim()
      if($stem.Length -lt 12){continue}
      $options=[ordered]@{}; $answer=''; $explanation=''; $j=$i+1
      while($j -lt $paras.Count -and $j -lt $i+24){
        $p=$paras[$j]
        if($p -match '^经典真题\d+·' -and $p.Length -gt 25){break}
        if($p -match '^([A-E])\s*[\.．、]\s*(.+)$'){$options[$matches[1]]=$matches[2].Trim()}
        elseif($p -match '^【答案】\s*([A-E]+)'){$answer=$matches[1]}
        elseif($p -match '^【解析】\s*(.+)$'){$explanation=$matches[1].Trim()}
        elseif($answer -and -not $explanation -and $p -notmatch '^经典真题\d+·'){$explanation=$p}
        $j++
      }
      $invalidAnswerCount=@($answer.ToCharArray() | Where-Object { -not $options.Contains([string]$_) }).Count
      if($options.Count -ge 4 -and $answer -and $invalidAnswerCount -eq 0){
        $year=([regex]::Match($stem,'（(20\d{2})年')).Groups[1].Value
        $cleanStem=($stem -replace '（20\d{2}年[^）]*）\s*$','').Trim()
        $results.Add([pscustomobject]@{chapterId=$chapter;type=if($kind -eq '多选题'){'multiple'}else{'single'};stem=$cleanStem;options=@($options.GetEnumerator()|ForEach-Object {[pscustomobject]@{key=$_.Key;text=$_.Value}});answer=@($answer.ToCharArray()|ForEach-Object {[string]$_});explanation=if($explanation){$explanation}else{"答案为$answer。"};year=if($year){[int]$year}else{$null};source='2026年CPA经济法基础细讲班·授权历年题'})
        $i=$j-1
      }
    }
  }
} finally {$zip.Dispose()}
$parent=Split-Path -Parent $Output; New-Item -ItemType Directory -Force -Path $parent | Out-Null
$results | ConvertTo-Json -Depth 8 -Compress | Set-Content -LiteralPath $Output -Encoding utf8NoBOM
$byChapter=$results|Group-Object chapterId|Sort-Object Name|ForEach-Object{"$($_.Name):$($_.Count)"}
Write-Output "Extracted $($results.Count) authorized questions ($($byChapter -join ', '))"
