const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function initDatabase() {
    const db = await open({
        filename: path.join(__dirname, 'github.db'),
        driver: sqlite3.Database
    });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS github_users (
            user_id TEXT PRIMARY KEY,
            github_id TEXT NOT NULL,
            github_login TEXT NOT NULL,
            access_token TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS repo_webhooks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            channel_id TEXT NOT NULL,
            repo TEXT NOT NULL,
            webhook_secret TEXT NOT NULL,
            webhook_id TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(channel_id, repo),
            FOREIGN KEY (user_id) REFERENCES github_users(user_id)
        );
    `);

    return db;
}

module.exports = initDatabase();