#!/bin/bash
set -e

echo "====================================="
echo "🚀 Izgara Server Deploy boshlandi..."
echo "====================================="

cd /home/izgara-server

# 1. Agar git remote mavjud bo'lsa yangi kodni olish
if git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    echo "📥 Git yangilanishlari olinmoqda..."
    git pull origin master || echo "⚠️ Git pull qilinmadi, joriy fayllar bilan davom etiladi"
fi

# 2. Docker compose orqali qayta qurish va ishga tushirish
echo "🐳 Docker konteyner qayta qurilmoqda va ishga tushirilmoqda..."
docker compose up -d --build

# 3. Kesh va eski keraksiz obrazlarni tozalash
echo "🧹 Eski docker obrazlari tozalanmoqda..."
docker image prune -f

# 4. Holatni tekshirish
echo "🔍 Konteyner holati:"
docker ps --filter "name=izgara-server"

echo ""
echo "📜 Oxirgi loglar:"
docker logs --tail 15 izgara-server

echo ""
echo "====================================="
echo "✅ Izgara Server muvaffaqiyatli yangilandi!"
echo "====================================="
