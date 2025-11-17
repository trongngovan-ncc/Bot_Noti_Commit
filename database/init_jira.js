const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function initDatabase() {
    const db = await open({
        filename: path.join(__dirname, 'jira.db'),
        driver: sqlite3.Database
    });

    await db.exec(`
        -- Bảng lưu thông tin user Jira liên kết với user Mezon
        CREATE TABLE IF NOT EXISTS jira_users (
          mezon_user_id TEXT,
          account_id TEXT,
          cloud_id TEXT,
          email TEXT,
          display_name TEXT,
          access_token TEXT,
          refresh_token TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (mezon_user_id, account_id, cloud_id)
        );

        -- Bảng lưu thông tin webhook đã đăng ký
        CREATE TABLE IF NOT EXISTS jira_webhooks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          mezon_user_id TEXT,
          account_id TEXT,
          cloud_id TEXT,
          project_key TEXT,
          channel_id TEXT,
          webhook_id TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (mezon_user_id, account_id, cloud_id)
            REFERENCES jira_users(mezon_user_id, account_id, cloud_id)
        );
    `);

    return db;
}

module.exports = initDatabase();