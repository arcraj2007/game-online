const express = require("express");
const path = require("path");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const gameRoutes = require("./routes/games");
const withdrawalRoutes = require("./routes/withdrawals");

const app = express();

const PORT = process.env.PORT || 3000;

// --------------------------------------------------
// Middleware
// --------------------------------------------------

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({
    extended: true
}));

// --------------------------------------------------
// Serve frontend/public files
// --------------------------------------------------

app.use(
    express.static(
        path.join(__dirname, "..", "public")
    )
);

// --------------------------------------------------
// API Routes
// --------------------------------------------------

app.use(
    "/api/auth",
    authRoutes
);

app.use(
    "/api/games",
    gameRoutes
);

app.use(
    "/api/withdrawals",
    withdrawalRoutes
);

// --------------------------------------------------
// Wallet endpoint
// --------------------------------------------------

const {
    getUserWallet
} = require("./database");

const {
    authenticate
} = require("./routes/auth");

app.get(
    "/api/wallet",
    authenticate,
    async (req, res) => {

        try {

            const wallet =
                await getUserWallet(req.user.id);

            res.json({
                success: true,
                balance: wallet.balance
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                success: false,
                message: "Unable to load wallet."
            });

        }
    }
);

// --------------------------------------------------
// Health check
// --------------------------------------------------

app.get(
    "/api/health",
    (req, res) => {

        res.json({
            success: true,
            message: "TokenPlay API is running."
        });

    }
);

// --------------------------------------------------
// Catch unknown API routes
// --------------------------------------------------

app.use(
    "/api",
    (req, res) => {

        res.status(404).json({
            success: false,
            message: "API endpoint not found."
        });

    }
);

// --------------------------------------------------
// Start server
// --------------------------------------------------

app.listen(
    PORT,
    () => {

        console.log("");
        console.log("================================");
        console.log(" TokenPlay Backend");
        console.log("================================");
        console.log(
            `Server: http://localhost:${PORT}`
        );
        console.log(
            `Health: http://localhost:${PORT}/api/health`
        );
        console.log("================================");
        console.log("");

    }
);