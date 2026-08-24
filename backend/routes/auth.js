const express = require("express");

const bcrypt = require("bcryptjs");

const jwt = require("jsonwebtoken");

const router = express.Router();

const {
    createUser,
    getUserByEmail,
    getUserById
} = require("../database");


// --------------------------------------------------
// JWT secret
// --------------------------------------------------

const JWT_SECRET =
    process.env.JWT_SECRET ||
    "CHANGE_THIS_SECRET_IN_PRODUCTION";


// --------------------------------------------------
// Authentication middleware
// --------------------------------------------------

function authenticate(
    req,
    res,
    next
) {

    const header =
        req.headers.authorization;

    if (!header) {

        return res.status(401).json({
            success: false,
            message: "Authentication required."
        });

    }


    const parts =
        header.split(" ");

    if (
        parts.length !== 2 ||
        parts[0] !== "Bearer"
    ) {

        return res.status(401).json({
            success: false,
            message: "Invalid authorization header."
        });

    }


    const token = parts[1];


    try {

        const decoded =
            jwt.verify(
                token,
                JWT_SECRET
            );

        req.user = decoded;

        next();

    } catch (error) {

        return res.status(401).json({
            success: false,
            message: "Invalid or expired token."
        });

    }

}


// --------------------------------------------------
// Register
// --------------------------------------------------

router.post(
    "/register",
    async (req, res) => {

        try {

            let {
                email,
                password
            } = req.body;


            if (
                typeof email !== "string" ||
                typeof password !== "string"
            ) {

                return res.status(400).json({
                    success: false,
                    message: "Email and password are required."
                });

            }


            email =
                email
                    .trim()
                    .toLowerCase();


            if (password.length < 8) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Password must contain at least 8 characters."
                });

            }


            const existingUser =
                await getUserByEmail(email);


            if (existingUser) {

                return res.status(409).json({
                    success: false,
                    message:
                        "An account with this email already exists."
                });

            }


            const passwordHash =
                await bcrypt.hash(
                    password,
                    12
                );


            const user =
                await createUser(
                    email,
                    passwordHash
                );


            const token =
                jwt.sign(
                    {
                        id: user.id,
                        email: user.email
                    },
                    JWT_SECRET,
                    {
                        expiresIn: "7d"
                    }
                );


            res.status(201).json({

                success: true,

                message:
                    "Account created successfully.",

                token,

                user: {
                    id: user.id,
                    email: user.email
                }

            });


        } catch (error) {

            console.error(error);

            res.status(500).json({
                success: false,
                message: "Registration failed."
            });

        }

    }
);


// --------------------------------------------------
// Login
// --------------------------------------------------

router.post(
    "/login",
    async (req, res) => {

        try {

            let {
                email,
                password
            } = req.body;


            if (
                typeof email !== "string" ||
                typeof password !== "string"
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Email and password are required."
                });

            }


            email =
                email
                    .trim()
                    .toLowerCase();


            const user =
                await getUserByEmail(email);


            if (!user) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Invalid email or password."
                });

            }


            const validPassword =
                await bcrypt.compare(
                    password,
                    user.password_hash
                );


            if (!validPassword) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Invalid email or password."
                });

            }


            const token =
                jwt.sign(
                    {
                        id: user.id,
                        email: user.email
                    },
                    JWT_SECRET,
                    {
                        expiresIn: "7d"
                    }
                );


            res.json({

                success: true,

                message:
                    "Login successful.",

                token,

                user: {
                    id: user.id,
                    email: user.email
                }

            });


        } catch (error) {

            console.error(error);

            res.status(500).json({
                success: false,
                message: "Login failed."
            });

        }

    }
);


// --------------------------------------------------
// Current user
// --------------------------------------------------

router.get(
    "/me",
    authenticate,
    async (req, res) => {

        try {

            const user =
                await getUserById(
                    req.user.id
                );


            if (!user) {

                return res.status(404).json({
                    success: false,
                    message: "User not found."
                });

            }


            res.json({
                success: true,
                user
            });


        } catch (error) {

            console.error(error);

            res.status(500).json({
                success: false,
                message:
                    "Unable to load user."
            });

        }

    }
);


module.exports = router;

module.exports.authenticate =
    authenticate;