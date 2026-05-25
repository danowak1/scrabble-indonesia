# Scrabble Indonesia Online 2-4 Pemain - Fix Reconnect

Perbaikan:
- URL root `/` langsung membuka game.
- Update state dikirim ke semua pemain setelah setiap aksi.
- Pemain yang putus bisa sambung lagi dari browser yang sama.
- Ada tombol Refresh.

Upload ke GitHub root:
- package.json
- server.js
- words.json
- public/index.html

Render:
- Build Command: npm install
- Start Command: npm start
- Deploy: Manual Deploy -> Clear build cache & deploy
