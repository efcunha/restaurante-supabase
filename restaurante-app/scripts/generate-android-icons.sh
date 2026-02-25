#!/bin/bash

# Script para gerar ícones Android em todos os tamanhos necessários
# A partir da imagem icone.png (1024x1024)

SOURCE_IMAGE="../imagem/icone.png"
ANDROID_RES="../android/app/src/main/res"

# Verificar se ImageMagick está instalado
if ! command -v convert &> /dev/null && ! command -v magick &> /dev/null; then
    echo "❌ ImageMagick não está instalado!"
    echo "Instale com: sudo apt-get install imagemagick (Linux) ou brew install imagemagick (Mac)"
    exit 1
fi

# Usar 'magick' se disponível, senão 'convert'
if command -v magick &> /dev/null; then
    CONVERT_CMD="magick"
else
    CONVERT_CMD="convert"
fi

echo "🎨 Gerando ícones Android a partir de $SOURCE_IMAGE..."

# Definir tamanhos para cada densidade
declare -A SIZES=(
    ["mdpi"]=48
    ["hdpi"]=72
    ["xhdpi"]=96
    ["xxhdpi"]=144
    ["xxxhdpi"]=192
)

# Gerar ícones para cada densidade
for density in "${!SIZES[@]}"; do
    size=${SIZES[$density]}
    output_dir="$ANDROID_RES/mipmap-$density"
    
    echo "  Gerando ícones ${size}x${size} para $density..."
    
    # ic_launcher.png (ícone quadrado)
    $CONVERT_CMD "$SOURCE_IMAGE" -resize ${size}x${size} "$output_dir/ic_launcher.png"
    
    # ic_launcher_round.png (ícone redondo)
    $CONVERT_CMD "$SOURCE_IMAGE" -resize ${size}x${size} \
        \( +clone -threshold -1 -negate -fill white -draw "circle $((size/2)),$((size/2)) $((size/2)),0" \) \
        -alpha off -compose copy_opacity -composite \
        "$output_dir/ic_launcher_round.png"
    
    # ic_launcher_foreground.png (para adaptive icon - 108dp, mas usamos 432px para xxxhdpi)
    foreground_size=$((size * 108 / 48))
    $CONVERT_CMD "$SOURCE_IMAGE" -resize ${foreground_size}x${foreground_size} \
        -gravity center -background none -extent ${foreground_size}x${foreground_size} \
        "$output_dir/ic_launcher_foreground.png"
    
    # Remover arquivos .webp antigos se existirem
    rm -f "$output_dir/ic_launcher.webp" 2>/dev/null
    rm -f "$output_dir/ic_launcher_round.webp" 2>/dev/null
    rm -f "$output_dir/ic_launcher_foreground.webp" 2>/dev/null
done

echo "✅ Ícones gerados com sucesso!"
echo ""
echo "📱 Próximos passos:"
echo "1. Reconstrua o app: cd android && ./gradlew clean"
echo "2. Execute: npx expo run:android"
echo ""
