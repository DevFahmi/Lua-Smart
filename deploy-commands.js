const { REST, Routes } = require('discord.js');
require('dotenv').config();

const commands = [{
    name: 'deobfuscate',
    description: 'Deobfuscate script Roblox Lua secara manual',
    options: [{
        type: 11,
        name: 'file',
        description: 'Upload file .lua / .txt',
        required: true
    }]
}];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    try {
        await rest.put(Routes.applicationCommands('MASUKKAN_BOT_ID_ANDA'), { body: commands });
        console.log('✅ Slash Command berhasil didaftarkan!');
    } catch (error) {
        console.error(error);
    }
})();
