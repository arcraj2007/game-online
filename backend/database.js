const sqlite3 = require("sqlite3").verbose();

const path = require("path");

const databasePath = path.join(
    __dirname,
    "tokenplay.sqlite"
);

const db = new sqlite3.Database(
    databasePath,
    (error) => {

        if (error) {

            console.error(
                "Database connection failed:",
                error
            );

        } else {

            console.log(
                "SQLite database connected."
            );

        }

    }
);


// --------------------------------------------------
// Helper functions
// --------------------------------------------------

function run(sql, params = []) {

    return new Promise(
        (resolve, reject) => {

            db.run(
                sql,
                params,
                function (error) {

                    if (error) {
                        reject(error);
                        return;
                    }

                    resolve({
                        id: this.lastID,
                        changes: this.changes
                    });

                }
            );

        }
    );

}


function get(sql, params = []) {

    return new Promise(
        (resolve, reject) => {

            db.get(
                sql,
                params,
                (error, row) => {

                    if (error) {
                        reject(error);
                        return;
                    }

                    resolve(row);

                }
            );

        }
    );

}


function all(sql, params = []) {

    return new Promise(
        (resolve, reject) => {

            db.all(
                sql,
                params,
                (error, rows) => {

                    if (error) {
                        reject(error);
                        return;
                    }

                    resolve(rows);

                }
            );

        }
    );

}


// --------------------------------------------------
// Create tables
// --------------------------------------------------

async function initializeDatabase() {

    await run(`
        CREATE TABLE IF NOT EXISTS users (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            email TEXT UNIQUE NOT NULL,

            password_hash TEXT NOT NULL,

            created_at DATETIME DEFAULT CURRENT_TIMESTAMP

        )
    `);


    await run(`
        CREATE TABLE IF NOT EXISTS wallets (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            user_id INTEGER UNIQUE NOT NULL,

            balance INTEGER NOT NULL DEFAULT 0,

            FOREIGN KEY(user_id)
                REFERENCES users(id)

        )
    `);


    await run(`
        CREATE TABLE IF NOT EXISTS game_sessions (

            id TEXT PRIMARY KEY,

            user_id INTEGER NOT NULL,

            game_id TEXT NOT NULL,

            status TEXT NOT NULL DEFAULT 'active',

            reward INTEGER NOT NULL DEFAULT 0,

            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

            completed_at DATETIME,

            FOREIGN KEY(user_id)
                REFERENCES users(id)

        )
    `);


    await run(`
        CREATE TABLE IF NOT EXISTS token_transactions (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            user_id INTEGER NOT NULL,

            type TEXT NOT NULL,

            amount INTEGER NOT NULL,

            description TEXT,

            reference_id TEXT,

            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY(user_id)
                REFERENCES users(id)

        )
    `);


    await run(`
        CREATE TABLE IF NOT EXISTS withdrawals (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            user_id INTEGER NOT NULL,

            amount INTEGER NOT NULL,

            method TEXT NOT NULL,

            payment_details TEXT NOT NULL,

            status TEXT NOT NULL DEFAULT 'pending',

            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

            processed_at DATETIME,

            FOREIGN KEY(user_id)
                REFERENCES users(id)

        )
    `);

}


// --------------------------------------------------
// User functions
// --------------------------------------------------

async function createUser(
    email,
    passwordHash
) {

    const result = await run(
        `
        INSERT INTO users
        (
            email,
            password_hash
        )
        VALUES (?, ?)
        `,
        [
            email,
            passwordHash
        ]
    );

    await run(
        `
        INSERT INTO wallets
        (
            user_id,
            balance
        )
        VALUES (?, 0)
        `,
        [
            result.id
        ]
    );

    return getUserById(result.id);
}


async function getUserByEmail(email) {

    return get(
        `
        SELECT *
        FROM users
        WHERE email = ?
        `,
        [email]
    );

}


async function getUserById(id) {

    return get(
        `
        SELECT
            id,
            email,
            created_at
        FROM users
        WHERE id = ?
        `,
        [id]
    );

}


// --------------------------------------------------
// Wallet functions
// --------------------------------------------------

async function getUserWallet(userId) {

    return get(
        `
        SELECT
            user_id,
            balance
        FROM wallets
        WHERE user_id = ?
        `,
        [userId]
    );

}


async function addTokens(
    userId,
    amount,
    description,
    referenceId
) {

    if (
        !Number.isInteger(amount) ||
        amount <= 0
    ) {

        throw new Error(
            "Invalid token amount."
        );

    }

    await run(
        `
        UPDATE wallets
        SET balance = balance + ?
        WHERE user_id = ?
        `,
        [
            amount,
            userId
        ]
    );


    await run(
        `
        INSERT INTO token_transactions
        (
            user_id,
            type,
            amount,
            description,
            reference_id
        )
        VALUES (?, 'earn', ?, ?, ?)
        `,
        [
            userId,
            amount,
            description,
            referenceId
        ]
    );

}


async function removeTokens(
    userId,
    amount,
    description,
    referenceId
) {

    if (
        !Number.isInteger(amount) ||
        amount <= 0
    ) {

        throw new Error(
            "Invalid token amount."
        );

    }

    const wallet =
        await getUserWallet(userId);

    if (!wallet) {

        throw new Error(
            "Wallet not found."
        );

    }

    if (wallet.balance < amount) {

        throw new Error(
            "Insufficient token balance."
        );

    }


    await run(
        `
        UPDATE wallets
        SET balance = balance - ?
        WHERE user_id = ?
        `,
        [
            amount,
            userId
        ]
    );


    await run(
        `
        INSERT INTO token_transactions
        (
            user_id,
            type,
            amount,
            description,
            reference_id
        )
        VALUES (?, 'withdrawal', ?, ?, ?)
        `,
        [
            userId,
            -amount,
            description,
            referenceId
        ]
    );

}


// --------------------------------------------------
// Game functions
// --------------------------------------------------

async function createGameSession(
    sessionId,
    userId,
    gameId
) {

    await run(
        `
        INSERT INTO game_sessions
        (
            id,
            user_id,
            game_id
        )
        VALUES (?, ?, ?)
        `,
        [
            sessionId,
            userId,
            gameId
        ]
    );

}


async function getGameSession(
    sessionId
) {

    return get(
        `
        SELECT *
        FROM game_sessions
        WHERE id = ?
        `,
        [sessionId]
    );

}


async function completeGameSession(
    sessionId,
    reward
) {

    return run(
        `
        UPDATE game_sessions
        SET
            status = 'completed',
            reward = ?,
            completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
        AND status = 'active'
        `,
        [
            reward,
            sessionId
        ]
    );

}


// --------------------------------------------------
// Withdrawal functions
// --------------------------------------------------

async function createWithdrawal(
    userId,
    amount,
    method,
    paymentDetails
) {

    const result = await run(
        `
        INSERT INTO withdrawals
        (
            user_id,
            amount,
            method,
            payment_details
        )
        VALUES (?, ?, ?, ?)
        `,
        [
            userId,
            amount,
            method,
            paymentDetails
        ]
    );

    return get(
        `
        SELECT *
        FROM withdrawals
        WHERE id = ?
        `,
        [result.id]
    );

}


async function getWithdrawals(
    userId
) {

    return all(
        `
        SELECT
            id,
            amount,
            method,
            status,
            created_at,
            processed_at
        FROM withdrawals
        WHERE user_id = ?
        ORDER BY created_at DESC
        `,
        [userId]
    );

}


// --------------------------------------------------
// Initialize database
// --------------------------------------------------

initializeDatabase()
    .then(() => {

        console.log(
            "Database tables ready."
        );

    })
    .catch((error) => {

        console.error(
            "Database initialization error:",
            error
        );

    });


// --------------------------------------------------
// Exports
// --------------------------------------------------

module.exports = {

    get,
    all,
    run,

    createUser,
    getUserByEmail,
    getUserById,

    getUserWallet,
    addTokens,
    removeTokens,

    createGameSession,
    getGameSession,
    completeGameSession,

    createWithdrawal,
    getWithdrawals

};