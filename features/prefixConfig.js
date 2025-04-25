const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../prefixConfig.json');

function loadConfig() {
    try {
        const data = fs.readFileSync(configPath, 'utf-8');
        return JSON.parse(data);
    } catch {
        return {
            multiPrefix: true,
            prefixes: ['#', '/', '!'],
            singlePrefix: '#'
        };
    }
}

function saveConfig(config) {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function getActivePrefixes() {
    const config = loadConfig();
    if (config.multiPrefix) {
        return config.prefixes;
    } else {
        return [config.singlePrefix];
    }
}

function setPrefix(newPrefix) {
    const config = loadConfig();
    config.singlePrefix = newPrefix;
    saveConfig(config);
}

function togglePrefixMode(mode) {
    const config = loadConfig();
    config.multiPrefix = mode === 'multi';
    saveConfig(config);
}

module.exports = {
    getActivePrefixes,
    setPrefix,
    togglePrefixMode
};