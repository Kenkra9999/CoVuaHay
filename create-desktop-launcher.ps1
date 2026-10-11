Add-Type -AssemblyName System.Drawing

$projectDir = "C:\Users\kenkr\OneDrive\Desktop\testfile\covuatesst"
$desktopDir = "C:\Users\kenkr\OneDrive\Desktop"

Write-Host "1. Copying artwork to Desktop..."
Copy-Item "$projectDir\public\chess-battlefield.png" "$desktopDir\Chien-Truong-Co-Vua.png" -Force
Copy-Item "$projectDir\public\hero-chess.png" "$desktopDir\Hinh-Nen-Vo-Dai-Co-Vua.png" -Force

Write-Host "2. Creating high-resolution 256x256 multi-icon..."
$heroImg = [System.Drawing.Bitmap]::FromFile("$projectDir\public\hero-chess.png")

# Crop the majestic King & Knight section from hero-chess.png
# hero-chess.png is widescreen (approx 1920x800). Knight and King are positioned on the right half.
$cropSize = [Math]::Min($heroImg.Height, 800)
$cropX = [Math]::Max(0, [int]($heroImg.Width * 0.58) - [int]($cropSize * 0.45))
$cropY = 0

$cropRect = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropSize, $cropSize)
$croppedBmp = New-Object System.Drawing.Bitmap(512, 512)
$gCrop = [System.Drawing.Graphics]::FromImage($croppedBmp)
$gCrop.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gCrop.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$gCrop.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

# Draw the cropped scene
$gCrop.DrawImage($heroImg, (New-Object System.Drawing.Rectangle(0, 0, 512, 512)), $cropRect, [System.Drawing.GraphicsUnit]::Pixel)

# Draw an opulent golden battlefield border and royal crest
$penGoldOuter = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(240, 223, 189, 130), 12)
$penGoldInner = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(180, 255, 235, 175), 4)

# Draw rounded rectangle border
$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$radius = 64
$rect = New-Object System.Drawing.Rectangle(6, 6, 500, 500)
$path.AddArc($rect.X, $rect.Y, $radius, $radius, 180, 90)
$path.AddArc($rect.Right - $radius, $rect.Y, $radius, $radius, 270, 90)
$path.AddArc($rect.Right - $radius, $rect.Bottom - $radius, $radius, $radius, 0, 90)
$path.AddArc($rect.X, $rect.Bottom - $radius, $radius, $radius, 90, 90)
$path.CloseFigure()

$gCrop.DrawPath($penGoldOuter, $path)
$gCrop.DrawPath($penGoldInner, $path)

$penGoldOuter.Dispose()
$penGoldInner.Dispose()
$path.Dispose()
$gCrop.Dispose()
$heroImg.Dispose()

# Save PNG badge
$croppedBmp.Save("$projectDir\public\chess-app-icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$croppedBmp.Save("$desktopDir\Nuoc-Co-Icon.png", [System.Drawing.Imaging.ImageFormat]::Png)

# Generate multi-size .ico file
$sizes = @(256, 128, 64, 48, 32, 16)
$entries = @()

foreach ($sz in $sizes) {
    $resized = New-Object System.Drawing.Bitmap $sz, $sz
    $g = [System.Drawing.Graphics]::FromImage($resized)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($croppedBmp, 0, 0, $sz, $sz)
    $g.Dispose()

    $ms = New-Object System.IO.MemoryStream
    $resized.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $resized.Dispose()
    $entries += @{ Size = $sz; Bytes = $ms.ToArray() }
    $ms.Dispose()
}
$croppedBmp.Dispose()

function Write-Ico([string]$outPath, $entries) {
    $fs = [System.IO.File]::Create($outPath)
    $bw = New-Object System.IO.BinaryWriter $fs

    $bw.Write([uint16]0)
    $bw.Write([uint16]1)
    $bw.Write([uint16]$entries.Count)

    $offset = 6 + ($entries.Count * 16)
    foreach ($e in $entries) {
        $w = if ($e.Size -ge 256) { [byte]0 } else { [byte]$e.Size }
        $h = if ($e.Size -ge 256) { [byte]0 } else { [byte]$e.Size }
        $bw.Write($w)
        $bw.Write($h)
        $bw.Write([byte]0)
        $bw.Write([byte]0)
        $bw.Write([uint16]1)
        $bw.Write([uint16]32)
        $bw.Write([uint32]$e.Bytes.Length)
        $bw.Write([uint32]$offset)
        $offset += $e.Bytes.Length
    }

    foreach ($e in $entries) {
        $bw.Write($e.Bytes)
    }

    $bw.Dispose()
    $fs.Dispose()
}

$icoProjPath = "$projectDir\public\chess-app.ico"
$icoDesktopPath = "$desktopDir\Nuoc-Co-Icon.ico"

Write-Ico $icoProjPath $entries
Write-Ico $icoDesktopPath $entries

Write-Host "3. Creating Desktop Shortcut (.lnk)..."
$wsh = New-Object -ComObject WScript.Shell
$shortcutPath = "$desktopDir\Nuoc Co - Chien Truong Co Vua.lnk"
$shortcut = $wsh.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "$projectDir\start-nuoc-co.bat"
$shortcut.WorkingDirectory = $projectDir
$shortcut.IconLocation = "$icoProjPath,0"
$shortcut.Description = "Nuoc Co - Chien Truong Co Vua (AI Stockfish 19)"
$shortcut.Save()

# Also create Web URL shortcut as a direct backup
$urlPath = "$desktopDir\Nuoc Co (Web).url"
$urlContent = @"
[InternetShortcut]
URL=http://localhost:3000
IconIndex=0
IconFile=$icoProjPath
"@
[System.IO.File]::WriteAllText($urlPath, $urlContent)

Write-Host "Success! Created artwork, icon, and desktop shortcut."
