#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../tests/fixtures/images"

node -e "
const sharp = require('sharp')
;(async () => {
  await sharp({ create: { width: 640, height: 480, channels: 3, background: { r: 40, g: 90, b: 160 } } })
    .jpeg({ quality: 80 })
    .withMetadata({ icc: 'p3', exif: { IFD0: { Copyright: 'Fixture Owner', Artist: 'Fixture Artist' } } })
    .toFile('with-metadata.jpg')
  await sharp({ create: { width: 300, height: 200, channels: 4, background: { r: 200, g: 50, b: 50, alpha: 1 } } })
    .png()
    .toFile('plain.png')
  await sharp({ create: { width: 9000, height: 9000, channels: 3, background: '#000' } })
    .png({ compressionLevel: 9 })
    .toFile('huge.png')
})()
"

exiftool -q -overwrite_original \
  -GPSLatitude=50.1109 -GPSLatitudeRef=N -GPSLongitude=8.6821 -GPSLongitudeRef=E \
  -XMP-dc:Creator='Fixture Creator' -XMP-dc:Description='Fixture description' \
  -IPTC:By-line='Fixture Byline' -IPTC:City='Frankfurt' -Orientation#=6 \
  with-metadata.jpg

cp plain.png disguised.jpg
{ printf '%%PDF-1.4\n'; cat plain.png; } >polyglot.png
