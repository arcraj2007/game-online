const express = require("express");

const crypto = require("crypto");

const router = express.Router();

const {
    createGameSession,
    getGameSession,
    completeGameSession,
    addTokens
} = require("../database");

const {
    authenticate
} = require("./auth");


// --------------------------------------------------
// Game configuration
// --------------------------------------------------

const GAMES = {

    memory: {
        name: "Memory Challenge",
        maxReward: 100
    },

    reaction: {
        name: "Reaction Rush",
        maxReward: 75
    },

    puzzle: {
        name: "Daily Puzzle",
        maxReward: 150
    }

};


// --------------------------------------------------
// Start game
// --------------------------------------------------

router.post(
    "/:gameId/start",
    authenticate,
    async (req, res) => {

        try {

            const gameId =
                req.params.gameId;


            const game =
                GAMES[gameId];


            if (!game) {

                return res.status(404).json({
                    success: false,
                    message: "Game not found."
                });

            }


            const sessionId =
                crypto.randomUUID();


            await createGameSession(
                sessionId,
                req.user.id,
                gameId
            );


            res.json({

                success: true,

                gameSessionId:
                    sessionId,

                game: {
                    id: gameId,
                    name: game.name
                }

            });


        } catch (error) {

            console.error(error);

            res.status(500).json({
                success: false,
                message:
                    "Unable to start game."
            });

        }

    }
);


// --------------------------------------------------
// Complete game
// --------------------------------------------------

router.post(
    "/:gameId/complete",
    authenticate,
    async (req, res) => {

        try {

            const gameId =
                req.params.gameId;


            const {
                gameSessionId,
                score
            } = req.body;


            const game =
                GAMES[gameId];


            if (!game) {

                return res.status(404).json({
                    success: false,
                    message: "Game not found."
                });

            }


            if (!gameSessionId) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Game session is required."
                });

            }


            const session =
                await getGameSession(
                    gameSessionId
                );


            if (!session) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Game session not found."
                });

            }


            if (
                session.user_id !==
                req.user.id
            ) {

                return res.status(403).json({
                    success: false,
                    message:
                        "This game session does not belong to you."
                });

            }


            if (
                session.game_id !==
                gameId
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid game session."
                });

            }


            if (
                session.status !==
                "active"
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Game session has already been completed."
                });

            }


            /*
              IMPORTANT:

              Do not blindly trust a reward value
              supplied by the browser.

              In a production game, validate the
              actual score/game result here.

              This example calculates a reward from
              the submitted score and caps it at the
              game's maximum reward.
            */

            const numericScore =
                Number(score);


            if (
                !Number.isFinite(
                    numericScore
                ) ||
                numericScore < 0
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid score."
                });

            }


            /*
              Example reward calculation.

              Replace this with the actual server-side
              rules for your game.
            */

            let reward =
                Math.floor(
                    numericScore
                );


            reward =
                Math.min(
                    reward,
                    game.maxReward
                );


            const result =
                await completeGameSession(
                    gameSessionId,
                    reward
                );


            if (result.changes !== 1) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Game has already been completed."
                });

            }


            if (reward > 0) {

                await addTokens(
                    req.user.id,
                    reward,
                    `Reward from ${game.name}`,
                    gameSessionId
                );

            }


            res.json({

                success: true,

                message:
                    "Game completed.",

                reward

            });


        } catch (error) {

            console.error(error);

            res.status(500).json({
                success: false,
                message:
                    "Unable to complete game."
            });

        }

    }
);


// --------------------------------------------------
// Available games
// --------------------------------------------------

router.get(
    "/",
    (req, res) => {

        res.json({

            success: true,

            games:
                Object.entries(GAMES)
                    .map(
                        ([id, game]) => ({
                            id,
                            name: game.name,
                            maxReward:
                                game.maxReward
                        })
                    )

        });

    }
);


module.exports = router;