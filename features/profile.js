const fs = require('fs');
const path = require('path');

const profilesPath = path.join(__dirname, '../profiles.json');

function loadProfiles() {
    try {
        return JSON.parse(fs.readFileSync(profilesPath, 'utf-8'));
    } catch {
        return {};
    }
}

function saveProfiles(profiles) {
    fs.writeFileSync(profilesPath, JSON.stringify(profiles, null, 2));
}

function getProfile(userId) {
    const profiles = loadProfiles();
    if (!profiles[userId]) {
        profiles[userId] = {
            pfp: null,
            bio: '',
            favorites: [],
            favoriteManga: [],
            firstSeen: Date.now(),
            lastActive: Date.now(),
            rank: 'Newbie',
            badges: [],
            roles: ['User'],
            birthday: null,
            theme: 'default'
        };
        saveProfiles(profiles);
    }
    return profiles[userId];
}

function updateProfile(userId, data) {
    const profiles = loadProfiles();
    profiles[userId] = { ...getProfile(userId), ...data, lastActive: Date.now() };
    saveProfiles(profiles);
}

module.exports = {
    getProfile,
    updateProfile
};