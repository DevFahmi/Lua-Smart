require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const fs = require('fs');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const COOLDOWN_FILE = './cooldowns.json';

const SYSTEM_PROMPT = `Kamu adalah Roblox Luau Deobfuscator dan Code Improver expert terbaik.

Tugasmu:
1. Deobfuscate script Lua/Luau yang dikirim (unpack obfuscation, decode strings, dll)
2. Bersihkan kode sepenuhnya (clean code, readable, modern style)
3. Rename semua variable, function, dan table menjadi nama yang jelas dan deskriptif
4. Perbaiki bug dan logic error jika ada
5. Optimasi performa jika memungkinkan
6. Tambahkan komentar yang membantu di bagian penting
7. Gunakan gaya coding Roblox modern (local variables, proper scoping)

Output WAJIB dalam format berikut:

\`\`\`lua
-- [Cleaned & Improved Roblox Script]
-- Deobfuscated by Lua Smart

[KODE LUA YANG SUDAH BERSIH DAN DIPERBAIKI]
\`\`\`

**Penjelasan Perubahan:**
- [Daftar perubahan yang dilakukan]
- [Bug yang diperbaiki]
- [Saran penggunaan]`;

// ================== CHANNEL WHITELIST ==================
function isAllowedChannel(channelId) {
    const allowed = process.env.ALLOWED_CHANNELS;
    if (!allowed) return true;
    
    const allowedList = allowed.split(',').map(id => id.trim());
    return allowedList.includes(channelId);
}

// ================== COOLDOWN ==================
function getCooldowns() {
    if (!fs.existsSync(COOLDOWN_FILE)) return {};
    return JSON.parse(fs.readFileSync(COOLDOWN_FILE, 'utf8'));
}

function saveCooldown(userId) {
    const cooldowns = getCooldowns();
    cooldowns[userId] = Date.now();
    fs.writeFileSync(COOLDOWN_FILE, JSON.stringify(cooldowns, null, 2));
}

function isOnCooldown(userId) {
    if (userId === process.env.OWNER_ID) return false;
    const cooldowns = getCooldowns();
    const lastUsed = cooldowns[userId];
    if (!lastUsed) return false;
    return Date.now() - lastUsed < 24 * 60 * 60 * 1000;
}

// ================== AI PROVIDERS ==================
async function callGroq(code) {
    const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: "llama-3.3-70b-versatile",
        temperature: 0.2,
        max_tokens: 8000,
        messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `Deobfuscate dan improve script Roblox Luau ini:\n\n${code}` }
        ]
    }, { 
        headers: { 
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json'
        },
        timeout: 90000
    });
    return res.data.choices[0].message.content;
}

async function callCerebras(code) {
    const res = await axios.post('https://api.cerebras.ai/v1/chat/completions', {
        model: "qwen-3-coder-480b",
        temperature: 0.2,
        max_tokens: 8000,
        messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `Deobfuscate dan improve script Roblox Luau ini:\n\n${code}` }
        ]
    }, { 
        headers: { 
            'Authorization': `Bearer ${process.env.CEREBRAS_API_KEY}`,
            'Content-Type': 'application/json'
        },
        timeout: 90000
    });
    return res.data.choices[0].message.content;
}

async function callOpenRouter(code) {
    const freeModels = [
        "deepseek/deepseek-chat-v3.1:free",
        "meta-llama/llama-3.3-70b-instruct:free",
        "qwen/qwen3-coder:free",
        "google/gemini-2.0-flash-exp:free",
        "mistralai/mistral-small-3.2-24b-instruct:free"
    ];
    
    for (const modelName of freeModels) {
        try {
            const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
                model: modelName,
                temperature: 0.2,
                max_tokens: 8000,
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: `Deobfuscate dan improve script Roblox Luau ini:\n\n${code}` }
                ]
            }, { 
                headers: { 
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'HTTP-Referer': 'https://github.com/DevFahmi/Lua-Smart',
                    'X-Title': 'Lua Smart Bot',
                    'Content-Type': 'application/json'
                },
                timeout: 90000
            });
            
            if (res.data?.choices?.[0]?.message?.content) {
                console.log(`✅ [OPENROUTER - ${modelName}] Berhasil!`);
                return res.data.choices[0].message.content;
            }
        } catch (e) {
            console.log(`⚠️ [OR - ${modelName}] Skip: ${e.response?.status || e.message}`);
            continue;
        }
    }
    throw new Error('Semua model OpenRouter gagal');
}

// ================== MAIN AI HANDLER ==================
async function processWithAI(code) {
    const providers = [];
    
    if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'dummy') {
        providers.push({ name: 'GROQ', fn: callGroq });
    }
    if (process.env.CEREBRAS_API_KEY && process.env.CEREBRAS_API_KEY !== 'dummy') {
        providers.push({ name: 'CEREBRAS', fn: callCerebras });
    }
    if (process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY !== 'dummy') {
        providers.push({ name: 'OPENROUTER', fn: callOpenRouter });
    }

    for (const provider of providers) {
        try {
            console.log(`🔄 Mencoba ${provider.name}...`);
            const result = await provider.fn(code);
            if (result) {
                console.log(`✅ [Lua Smart] Script berhasil diproses via ${provider.name}!`);
                return { success: true, result };
            }
        } catch (err) {
            const errMsg = err.response?.data?.error?.message || err.message;
            console.log(`❌ [${provider.name}] Error: ${errMsg}`);
        }
    }
    
    return { success: false };
}

// ================== AUTO DETECT ATTACHMENT ==================
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    // 🔒 Cek channel whitelist
    if (!isAllowedChannel(message.channel.id)) return;

    const attachment = message.attachments.first();
    if (!attachment) return;

    const filename = attachment.name.toLowerCase();
    if (!filename.endsWith('.lua') && !filename.endsWith('.luau') && !filename.endsWith('.txt')) return;

    if (isOnCooldown(message.author.id)) {
        return message.reply({ 
            content: "❌ Kamu hanya boleh memproses **1 script setiap 24 jam**." 
        });
    }

    const loading = await message.reply('🔄 **Lua Smart** sedang memproses script...');

    try {
        const res = await axios.get(attachment.url, { responseType: 'text' });
        const aiResult = await processWithAI(res.data);

        if (!aiResult.success) {
            return loading.edit('❌ Gagal memproses script. Coba lagi dalam beberapa menit.');
        }

        saveCooldown(message.author.id);

        const outputFile = new AttachmentBuilder(Buffer.from(aiResult.result), {
            name: 'cleaned_' + filename.replace('.txt', '.lua')
        });

        const embed = new EmbedBuilder()
            .setTitle('✅ Deobfuscation Berhasil')
            .setColor('Green')
            .setDescription(`Script dari **${message.author.tag}** telah dibersihkan oleh **Lua Smart**.`)
            .addFields(
                { name: '📄 File', value: filename, inline: true },
                { name: '⚡ Powered by', value: 'Lua Smart AI', inline: true }
            )
            .setFooter({ text: 'Lua Smart - Roblox Deobfuscator' })
            .setTimestamp();

        await loading.delete();
        await message.reply({ embeds: [embed], files: [outputFile] });

    } catch (error) {
        console.error(error);
        await loading.edit('❌ Terjadi kesalahan saat memproses file.');
    }
});

// ================== SLASH COMMAND ==================
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand() || interaction.commandName !== 'deobfuscate') return;

    // 🔒 Cek channel whitelist
    if (!isAllowedChannel(interaction.channel.id)) {
        return interaction.reply({ 
            content: '❌ Bot ini hanya bisa digunakan di channel tertentu. Silakan gunakan di channel yang ditentukan oleh admin.',
            ephemeral: true 
        });
    }

    const attachment = interaction.options.getAttachment('file');
    if (!attachment) return interaction.reply({ content: 'File tidak ditemukan!', ephemeral: true });

    await interaction.deferReply();

    const filename = attachment.name.toLowerCase();
    if (!filename.endsWith('.lua') && !filename.endsWith('.luau') && !filename.endsWith('.txt')) {
        return interaction.editReply('❌ Hanya mendukung file `.lua`, `.luau`, atau `.txt`');
    }

    if (isOnCooldown(interaction.user.id)) {
        return interaction.editReply('❌ Kamu hanya boleh memproses 1 script setiap 24 jam.');
    }

    try {
        const res = await axios.get(attachment.url, { responseType: 'text' });
        const aiResult = await processWithAI(res.data);

        if (!aiResult.success) {
            return interaction.editReply('❌ Gagal memproses script. Coba lagi nanti.');
        }

        saveCooldown(interaction.user.id);

        const file = new AttachmentBuilder(Buffer.from(aiResult.result), {
            name: 'cleaned_' + filename.replace('.txt', '.lua')
        });

        await interaction.editReply({
            content: `✅ Berhasil! Script telah diproses oleh **Lua Smart**.`,
            files: [file]
        });
    } catch (err) {
        console.error(err);
        await interaction.editReply('❌ Terjadi error saat memproses.');
    }
});

// ================== READY ==================
client.once('ready', () => {
    console.log(`✅ Bot ${client.user.tag} telah aktif!`);
    console.log(`🔥 Mode: Auto-Scan + Slash Command`);
    console.log(`⏳ Cooldown: 1 script / 24 jam per user`);
    
    if (process.env.ALLOWED_CHANNELS) {
        const channels = process.env.ALLOWED_CHANNELS.split(',').map(c => c.trim());
        console.log(`🔒 Channel Whitelist: ${channels.length} channel(s)`);
    } else {
        console.log(`🌐 Channel: Semua channel (tidak ada whitelist)`);
    }
    
    const activeAIs = [];
    if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'dummy') activeAIs.push('Groq');
    if (process.env.CEREBRAS_API_KEY && process.env.CEREBRAS_API_KEY !== 'dummy') activeAIs.push('Cerebras');
    if (process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY !== 'dummy') activeAIs.push('OpenRouter');
    console.log(`🤖 AI Engine: ${activeAIs.join(' → ')}`);
});

client.login(process.env.TOKEN);
