Param(
  [string]$OutDir = "",
  [string]$File = "",
  [string]$CsvOut = ""
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Resolve-Path (Join-Path $ScriptDir "..")

if ([string]::IsNullOrWhiteSpace($OutDir)) {
  $OutDir = Join-Path $RootDir "tmp/evidencias"
}

node (Join-Path $ScriptDir "analyze-homologacao-usb-serial-tef-balanca.mjs") $OutDir $File $CsvOut
