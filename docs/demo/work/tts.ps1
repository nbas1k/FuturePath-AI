param([string]$Dir)
# Озвучка русским голосом Windows (Microsoft Irina) для каждой сцены
Add-Type -AssemblyName System.Speech
$scenes = Get-Content -Raw -Encoding UTF8 "$Dir\scenes.json" | ConvertFrom-Json
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$s.SelectVoice("Microsoft Irina Desktop")
$s.Rate = 0
foreach ($sc in $scenes) {
  $s.SetOutputToWaveFile("$Dir\$($sc.id).wav")
  $s.Speak($sc.text)
}
$s.Dispose()
Write-Output "ok"
