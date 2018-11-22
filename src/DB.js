const Util = require("./Util.js");
const winston = require("winston");
const sqlite3 = require("better-sqlite3");

// FIXME: resolve objects when loading from db

class Database {
    constructor(file, client) {
        this.file = file;
        this.client = client;
    }

    execute(f) {
        let db = new sqlite3(this.file, [], err => {
            if(err) {
                return winston.log("error", "DB.js: DB open(): {0}".formatUnicorn(err["message"]));
            }
        });

        try {
            var res = f(db);
        } catch(err) {
            var res = undefined;
            winston.log("error", "DB.js: DB execute: {0}".formatUnicorn(err["message"]));
        }

        db.close(err => {
            if(err) {
                return winston.log("error", "DB.js: DB close(): {0}".formatUnicorn(err["message"]));
            }
        });
        return res;
    }

    // NOTE: https://github.com/orlandov/node-sqlite/issues/17
    // sqlite3 and node don't work well together in terms of large integers.
    // Therefore, all big numbers are stored as strings.
    // As a consequence, === can't be used, when checking them.
    initSchema() {
        let sqls = [
        `CREATE TABLE IF NOT EXISTS registrations(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user TEXT NOT NULL,
            guild TEXT NOT NULL,
            api_key TEXT NOT NULL,
            gw2account TEXT NOT NULL,
            created TIMESTAMP DEFAULT (datetime('now','localtime')),
            UNIQUE(user, guild) ON CONFLICT REPLACE,
            UNIQUE(guild, api_key)
        )`, // no ON CONFLICT for second unique, that's an actual error
        `CREATE TABLE IF NOT EXISTS cronjobs(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            schedule TEXT NOT NULL,
            command TEXT NOT NULL,
            arguments TEXT,
            created_by TEXT NOT NULL,
            guild TEXT NOT NULL,
            created TIMESTAMP DEFAULT (datetime('now','localtime'))
        )`,
        `CREATE TABLE IF NOT EXISTS faqs(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT,
            created_by TEXT NOT NULL,
            guild TEXT NOT NULL,
            created TIMESTAMP DEFAULT (datetime('now','localtime')),
            UNIQUE(text) ON CONFLICT REPLACE
        )`, 
        `CREATE TABLE IF NOT EXISTS faq_keys(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT NOT NULL,
            faq_id INTEGER,
            created_by TEXT NOT NULL,
            guild TEXT NOT NULL,
            created TIMESTAMP DEFAULT (datetime('now','localtime')),
            UNIQUE(key) ON CONFLICT REPLACE,
            FOREIGN KEY(faq_id) REFERENCES faqs(id) 
                ON DELETE CASCADE
        )`,
        `CREATE INDEX IF NOT EXISTS index_faq_keys_key ON faq_keys(key)`
        ]; 
        sqls.forEach(sql => this.execute(db => db.prepare(sql).run()));
    }

    storeFAQ(user, guild, keys, text) {
        return this.execute(db => {
            let last_id = undefined;
            db.transaction((_) => {
                db.prepare(`INSERT INTO faqs(created_by, guild, text) VALUES(?,?,?)`).run(user, guild, text);
                last_id = db.prepare(`SELECT last_insert_rowid() AS id`).get().id;
                keys.forEach(k => db.prepare(`INSERT INTO faq_keys(created_by, guild, key, faq_id) VALUES(?,?,?,?)`).run(user, guild, k, last_id));
            })(null);
            return last_id;
        });
    }

    deleteFAQ(key) {
        this.execute(db => db.prepare(`DELETE FROM faq_keys WHERE key = ?`).run(key));
        // clean up FAQs that are not linked to any keyword now.
        this.execute(db => db.prepare(`
            DELETE FROM faqs WHERE id IN
              (SELECT f.id FROM faqs AS f LEFT JOIN faq_keys AS fk ON f.id = fk.faq_id WHERE key IS NULL)
        `).run());
    }

    getFAQ(key, guild) {
        return this.execute(db => db.prepare(`SELECT * FROM faqs AS f JOIN faq_keys AS fk ON f.id = fk.faq_id WHERE fk.key = ? AND fk.guild = ?`).get(key, guild));
    }

    getFAQs(guild) {
        return this.execute(db => db.prepare(`SELECT * FROM faqs AS f JOIN faq_keys AS fk ON f.id = fk.faq_id WHERE fk.guild = ?`).all(guild));
    }

    storeAPIKey(user, guild, key, gw2account) {
        let sql = `INSERT INTO registrations(user, guild, api_key, gw2account) VALUES(?,?,?,?)`;
        return this.execute(db => {
                    try {
                        db.prepare(sql).run(user, guild, key, gw2account);
                        return true;
                    } catch(err) {
                        //winston.log("error",err);
                        return false;
                    }
                });
    }

    revalidateKeys() {
        return this.execute(db => 
            Promise.all(
                db.prepare(`SELECT api_key, guild, user FROM registrations ORDER BY guild`).all().map(r => Util.validateWorld(r.api_key).then(isOnWorld => !isOnWorld ? r : undefined))
            )
        );
    }

    deleteKey(key) {
        return this.execute(db => {
            let changes = 0;
            db.transaction((_) => {
                db.prepare(`DELETE FROM registrations WHERE api_key = ?`).run(key)
                changes = db.prepare(`SELECT changes() AS changes`).get().changes;
            })(null);
            return changes > 0;
        });
    }

    dummy() {
        return; // not testing rn
        let sql = `INSERT INTO registrations(user, api_key, gw2account) VALUES
        (?,?,?),
        (?,?,?)
        `;
        this.execute(db => db.prepare(sql).run([
            100, '4A820A42-000D-3B46-91B9-F7E664FEBAAEB321BE57-5FB1-4DF2-85A7-B88DD2202076',"asd", 
            230947151931375617, '4A820A42-000D-3B46-91B9-F7E664FEBAAEB321BE57-5FB1-4DF2-85A7-000000000000',"dsa"
            ]));

    }

    storeCronjob(schedule, command, args, creator, guild) {
        let sql = `INSERT INTO cronjobs(schedule, command, arguments, created_by, guild) VALUES (?,?,?,?,?)`;
        return this.execute(db => {
            let last_id = undefined;
            db.transaction((_) => {
                db.prepare(sql).run(schedule, command, args, creator, guild);
                last_id = db.prepare(`SELECT last_insert_rowid() AS id`).get().id;
            })(null);
            return last_id;
        });
    }

    getCronjobs() {
        return this.execute(db => db.prepare(`SELECT * FROM cronjobs`).all());
    }

    deleteCronjob(id) {
        return this.execute(db => {
            let changes = 0;
            db.transaction((_) => {
                db.prepare(`DELETE FROM cronjobs WHERE id = ?`).run(id)
                changes = db.prepare(`SELECT changes() AS changes`).get().changes;
            })(null);
            return changes > 0;
        });
    }
}

module.exports = Database;