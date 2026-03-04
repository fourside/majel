param(
    [int]$Seconds = 5,
    [string]$OutputPath
)

Add-Type -MemberDefinition @"
[DllImport("winmm.dll", CharSet = CharSet.Auto)]
public static extern int mciSendString(
    string command,
    System.Text.StringBuilder returnValue,
    int returnLength,
    IntPtr callback);
"@ -Name MCI -Namespace Win32

$sb = New-Object System.Text.StringBuilder 256
$alias = "rec"
$tmpFile = [System.IO.Path]::Combine($env:TEMP, "majel_recording.wav")

try {
    [Win32.MCI]::mciSendString("open new type waveaudio alias $alias", $sb, 256, [IntPtr]::Zero) | Out-Null
    # 16kHz 16bit mono PCM
    [Win32.MCI]::mciSendString("set $alias format tag pcm bitspersample 16 channels 1 samplespersec 16000 alignment 2 bytespersec 32000", $sb, 256, [IntPtr]::Zero) | Out-Null
    [Win32.MCI]::mciSendString("record $alias", $sb, 256, [IntPtr]::Zero) | Out-Null

    Write-Host "Recording for $Seconds seconds..."
    Start-Sleep -Seconds $Seconds

    [Win32.MCI]::mciSendString("stop $alias", $sb, 256, [IntPtr]::Zero) | Out-Null
    [Win32.MCI]::mciSendString("save $alias `"$tmpFile`"", $sb, 256, [IntPtr]::Zero) | Out-Null

    Copy-Item -Path $tmpFile -Destination $OutputPath -Force
    Remove-Item -Path $tmpFile -Force -ErrorAction SilentlyContinue
    Write-Host "OK"
}
finally {
    try { [Win32.MCI]::mciSendString("close $alias", $sb, 256, [IntPtr]::Zero) | Out-Null } catch {}
}
