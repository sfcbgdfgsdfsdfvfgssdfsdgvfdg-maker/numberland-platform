const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '../../DB.json');

let DB = { users: {}, orders: [], transactions: [] };

function loadDB() {
    if (fs.existsSync(DB_FILE)) {
        try {
            DB = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        } catch (error) {
            console.error("Error reading DB.json:", error);
        }
    } else {
        DB.users['user_123'] = { id: 'user_123', email: 'user@example.com', balance: 1.00 };
        saveDB();
    }
}

function saveDB() {
    fs.writeFileSync(DB_FILE, JSON.stringify(DB, null, 2));
}

loadDB();

module.exports = { DB, saveDB };
