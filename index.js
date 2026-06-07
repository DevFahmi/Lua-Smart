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
const MAX_CODE_SIZE = 30000;
const AUTO_DELETE_MS = 60000; // 1 menit

const SYSTEM_PROMPT = `Kamu adalah Roblox Luau Deobfuscator dan Code Improver expert terbaik.

Tugasmu:
1. Deobfuscate script Lua/Luau yang dikirim
2. Bersihkan kode (clean code, readable, modern)
3. Rename variable & function menjadi nama yang jelas
4. Perbaiki bug jika ada
5. Optimasi performa
6. Tambahkan komentar penting

Output WAJIB dalam format:

\`\`\`lua
-- [Cleaned & Improved Roblox Script]
-- Deobfuscated by Lua Smart

[KODE LUA BERSIH]
\`\`\`

**Penjelasan:** [Daftar perubahan]`;

// ================== CHANNEL WHITELIST ==================
function isAllowedChannel(channelId) {
    const allowed = process.env.ALLOWED_CHANNELS;
    if (!allowed) return true;
    return allowed.split(',').map(id => id.trim()).includes(channelId);
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

// ================== HELPER ==================
function truncateCode(code, maxLength = MAX_CODE_SIZE) {
    if (code.length <= maxLength) return code;
    return code.substring(0, maxLength) + '\n\n-- [Script dipotong karena terlalu besar]';
}

// ================== AI PROVIDERS ==================
async function callGroq(code) {
    const models = [
        "llama-3.1-8b-instant",
        "llama-3.3-70b-versatile",
        "gemma2-9b-it"
    ];
    
    for (const modelName of models) {
        try {
            const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                model: modelName,
                temperature: 0.2,
                max_tokens: 8000,
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: `Deobfuscate script Roblox Luau ini:\n\n${code}` }
                ]
            }, { 
                headers: { 
                    'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 120000
            });
            
            if (res.data?.choices?.[0]?.message?.content) {
                console.log(`✅ [GROQ - ${modelName}] Berhasil!`);
                return res.data.choices[0].message.content;
            }
        } catch (e) {
            const errMsg = e.response?.data?.error?.message || e.message;
            console.log(`⚠️ [GROQ - ${modelName}] Skip: ${errMsg.substring(0, 100)}`);
            continue;
        }
    }
    throw new Error('Semua model Groq gagal');
}

async function callCerebras(code) {
    const models = [
        "llama-3.3-70b",
        "llama3.1-8b",
        "qwen-3-32b"
    ];
    
    for (const modelName of models) {
        try {
            const res = await axios.post('https://api.cerebras.ai/v1/chat/completions', {
                model: modelName,
                temperature: 0.2,
                max_tokens: 8000,
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: `Deobfuscate script Roblox Luau ini:\n\n${code}` }
                ]
            }, { 
                headers: { 
                    'Authorization': `Bearer ${process.env.CEREBRAS_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 120000
            });
            
            if (res.data?.choices?.[0]?.message?.content) {
                console.log(`✅ [CEREBRAS - ${modelName}] Berhasil!`);
                return res.data.choices[0].message.content;
            }
        } catch (e) {
            const errMsg = e.response?.data?.error?.message || e.message;
            console.log(`⚠️ [CEREBRAS - ${modelName}] Skip: ${errMsg.substring(0, 100)}`);
            continue;
        }
    }
    throw new Error('Semua model Cerebras gagal');
}

async function callOpenRouter(code) {
    const freeModels = [
        "meta-llama/llama-3.3-70b-instruct:free",
        "deepseek/deepseek-r1:free",
        "google/gemini-2.0-flash-exp:free",
        "qwen/qwen-2.5-coder-32b-instruct:free",
        "meta-llama/llama-3.2-3b-instruct:free",
        "mistralai/mistral-7b-instruct:free",
        "microsoft/phi-3-medium-128k-instruct:free"
    ];
    
    for (const modelName of freeModels) {
        try {
            const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
                model: modelName,
                temperature: 0.2,
                max_tokens: 8000,
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: `Deobfuscate script Roblox Luau ini:\n\n${code}` }
                ]
            }, { 
                headers: { 
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'HTTP-Referer': 'https://github.com/DevFahmi/Lua-Smart',
                    'X-Title': 'Lua Smart Bot',
                    'Content-Type': 'application/json'
                },
                timeout: 120000
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
    const originalSize = code.length;
    const processedCode = truncateCode(code);
    
    if (originalSize > MAX_CODE_SIZE) {
        console.log(`⚠️ Script dipotong dari ${originalSize} → ${processedCode.length} chars`);
    }
    
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
            const result = await provider.fn(processedCode);
            if (result) {
                console.log(`✅ [Lua Smart] Sukses via ${provider.name}!`);
                return { success: true, result };
            }
        } catch (err) {
            const errMsg = err.response?.data?.error?.message || err.message;
            console.log(`❌ [${provider.name}] Error: ${errMsg.substring(0, 150)}`);
        }
    }
    
    return { success: false };
}

// ================== AUTO DETECT ATTACHMENT ==================
client.on('messageCreate', async message => {
    if (message.author.bot) return;
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

    if (attachment.size > 500000) {
        return message.reply('❌ File terlalu besar! Maksimal 500KB.');
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
                { name: '⚡ Powered by', value: 'Lua Smart AI', inline: true },
                { name: '⏰ Auto Delete', value: '1 menit', inline: true }
            )
            .setFooter({ text: 'Lua Smart - Roblox Deobfuscator' })
            .setTimestamp();

        await loading.delete();
        const resultMessage = await message.reply({ 
            content: '⚠️ **File ini akan dihapus dalam 1 menit. Segera download!**',
            embeds: [embed], 
            files: [outputFile]
        });

        // 🗑️ Auto delete setelah 1 menit
        setTimeout(async () => {
            try {
                await resultMessage.delete();
                console.log(`🗑️ File hasil dari ${message.author.tag} sudah dihapus.`);
            } catch (err) {
                console.log('⚠️ Gagal hapus pesan auto-scan (mungkin sudah dihapus manual)');
            }
        }, AUTO_DELETE_MS);

    } catch (error) {
        console.error(error);
        await loading.edit('❌ Terjadi kesalahan saat memproses file.');
    }
});

// ================== SLASH COMMAND ==================
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand() || interaction.commandName !== 'deobfuscate') return;

    if (!isAllowedChannel(interaction.channel.id)) {
        return interaction.reply({ 
            content: '❌ Bot ini hanya bisa digunakan di channel tertentu.',
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

    if (attachment.size > 500000) {
        return interaction.editReply('❌ File terlalu besar! Maksimal 500KB.');
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
            content: `✅ Berhasil! Script telah diproses oleh **Lua Smart**.\n⚠️ **File ini akan dihapus dalam 1 menit. Segera download!**`,
            files: [file]
        });

        // 🗑️ Auto delete setelah 1 menit
        setTimeout(async () => {
            try {
                await interaction.deleteReply();
                console.log(`🗑️ File hasil slash command dari ${interaction.user.tag} sudah dihapus.`);
            } catch (err) {
                console.log('⚠️ Gagal hapus pesan slash command (mungkin sudah dihapus manual)');
            }
        }, AUTO_DELETE_MS);

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
    console.log(`📏 Max script size: ${MAX_CODE_SIZE} chars`);
    console.log(`🗑️ Auto delete: ${AUTO_DELETE_MS / 1000} detik`);
    
    if (process.env.ALLOWED_CHANNELS) {
        const channels = process.env.ALLOWED_CHANNELS.split(',').map(c => c.trim());
        console.log(`🔒 Channel Whitelist: ${channels.length} channel(s)`);
    } else {
        console.log(`🌐 Channel: Semua channel`);
    }
    
    const activeAIs = [];
    if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'dummy') activeAIs.push('Groq');
    if (process.env.CEREBRAS_API_KEY && process.env.CEREBRAS_API_KEY !== 'dummy') activeAIs.push('Cerebras');
    if (process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY !== 'dummy') activeAIs.push('OpenRouter');
    console.log(`🤖 AI Engine: ${activeAIs.join(' → ')}`);
});

client.login(process.env.TOKEN);
