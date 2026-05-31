# Roblox Lua Deobfuscator Bot

Bot Discord yang otomatis mendeteksi file `.lua`, `.luau`, atau `.txt` lalu melakukan deobfuscate, clean code, rename variable, dan fix bug menggunakan 3 AI sekaligus.

### Fitur
- Auto Scan Attachment
- Menggunakan 3 AI (Gemini 1.5 Flash → Grok → DeepSeek)
- Cooldown 1 script per 24 jam per user
- Slash Command `/deobfuscate`
- Hasil dikirim dalam format `.lua`

### Cara Penggunaan
1. Upload file script Roblox kamu
2. Bot akan otomatis memproses
3. Tunggu hasil `cleaned_....lua`

### Owner
- Owner bebas dari cooldown

### Tech Stack
- Node.js
- Discord.js v14
- Gemini, Grok, DeepSeek API
