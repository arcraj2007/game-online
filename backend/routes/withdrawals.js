const express = require("express");

const router = express.Router();

const {
    getUserWallet,
    removeTokens,
    createWithdrawal,
    getWithdrawals
} = require("../database");

const {
    authenticate
} = require("./auth");


// --------------------------------------------------
// Withdrawal settings
// --------------------------------------------------

const MINIMUM_WITHDRAWAL = 100;


// --------------------------------------------------
// Create withdrawal request
// --------------------------------------------------

router.post(
    "/",
    authenticate,
    async (req, res) => {

        try {

            const {
                amount,
                method,
                paymentDetails
            } = req.body;


            const numericAmount =
                Number(amount);


            if (
                !Number.isInteger(
                    numericAmount
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Withdrawal amount must be a whole number."
                });

            }


            if (
                numericAmount <
                MINIMUM_WITHDRAWAL
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        `Minimum withdrawal is ${MINIMUM_WITHDRAWAL} tokens.`
                });

            }


            const allowedMethods = [
                "bank",
                "upi"
            ];


            if (
                !allowedMethods.includes(
                    method
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid withdrawal method."
                });

            }


            if (
                typeof paymentDetails !==
                "string" ||
                paymentDetails.trim().length < 3
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Valid payment details are required."
                });

            }


            const wallet =
                await getUserWallet(
                    req.user.id
                );


            if (!wallet) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Wallet not found."
                });

            }


            if (
                wallet.balance <
                numericAmount
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Insufficient token balance."
                });

            }


            /*
              Deduct/hold the tokens before creating
              the withdrawal request.

              In a production implementation this
              should be performed in the same database
              transaction as creating the withdrawal.
            */

            const withdrawal =
                await createWithdrawal(
                    req.user.id,
                    numericAmount,
                    method,
                    paymentDetails.trim()
                );


            await removeTokens(
                req.user.id,
                numericAmount,
                "Withdrawal request",
                String(withdrawal.id)
            );


            res.status(201).json({

                success: true,

                message:
                    "Withdrawal request submitted.",

                withdrawal: {

                    id: withdrawal.id,

                    amount:
                        withdrawal.amount,

                    method:
                        withdrawal.method,

                    status:
                        withdrawal.status,

                    createdAt:
                        withdrawal.created_at

                }

            });


        } catch (error) {

            console.error(error);

            res.status(500).json({
                success: false,
                message:
                    "Unable to create withdrawal request."
            });

        }

    }
);


// --------------------------------------------------
// Withdrawal history
// --------------------------------------------------

router.get(
    "/",
    authenticate,
    async (req, res) => {

        try {

            const withdrawals =
                await getWithdrawals(
                    req.user.id
                );


            res.json({

                success: true,

                withdrawals

            });


        } catch (error) {

            console.error(error);

            res.status(500).json({
                success: false,
                message:
                    "Unable to load withdrawal history."
            });

        }

    }
);


module.exports = router;