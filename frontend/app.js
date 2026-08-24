let tokenBalance = 0;


/* =========================
   UI
========================= */

function scrollToGames() {
  document
    .getElementById("games")
    .scrollIntoView({
      behavior: "smooth"
    });
}


function openLogin() {
  document
    .getElementById("loginModal")
    .classList.add("active");
}


function closeLogin() {
  document
    .getElementById("loginModal")
    .classList.remove("active");
}


function openWithdraw() {

  document
    .getElementById("withdrawBalance")
    .textContent = tokenBalance;

  document
    .getElementById("withdrawModal")
    .classList.add("active");
}


function closeWithdraw() {
  document
    .getElementById("withdrawModal")
    .classList.remove("active");
}


/* =========================
   LOGIN
========================= */

async function login(event) {

  event.preventDefault();

  const email =
    document.getElementById("email").value;

  const password =
    document.getElementById("password").value;

  try {

    const response = await fetch(
      "/api/auth/login",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          email,
          password
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message);
    }

    localStorage.setItem(
      "token",
      data.token
    );

    closeLogin();

    await loadWallet();

    alert("Login successful!");

  } catch (error) {

    alert(
      error.message ||
      "Login failed"
    );

  }
}


/* =========================
   START GAME
========================= */

async function startGame(gameId) {

  const authToken =
    localStorage.getItem("token");

  if (!authToken) {

    openLogin();

    return;
  }

  try {

    /*
      IMPORTANT:

      The server must decide whether
      the player actually earned tokens.

      Never trust:

      earnTokens(100)

      directly in frontend JavaScript.
    */

    const response = await fetch(
      `/api/games/${gameId}/start`,
      {
        method: "POST",

        headers: {
          "Authorization":
            `Bearer ${authToken}`
        }
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(data.message);
    }

    /*
      Your real game would open here.
    */

    alert(
      `Game started!\nGame ID: ${data.gameSessionId}`
    );

  } catch (error) {

    alert(
      error.message ||
      "Unable to start game"
    );

  }
}


/* =========================
   WALLET
========================= */

async function loadWallet() {

  const authToken =
    localStorage.getItem("token");

  if (!authToken) return;

  try {

    const response = await fetch(
      "/api/wallet",
      {
        headers: {
          "Authorization":
            `Bearer ${authToken}`
        }
      }
    );

    const data =
      await response.json();

    tokenBalance =
      data.balance;

    document
      .getElementById("tokenBalance")
      .textContent = tokenBalance;

  } catch (error) {

    console.error(
      "Wallet error:",
      error
    );

  }
}


/* =========================
   WITHDRAW
========================= */

async function requestWithdrawal(event) {

  event.preventDefault();

  const authToken =
    localStorage.getItem("token");

  if (!authToken) {

    closeWithdraw();
    openLogin();

    return;
  }

  const amount =
    Number(
      document
        .getElementById("withdrawAmount")
        .value
    );

  const method =
    document
      .getElementById("withdrawMethod")
      .value;

  const paymentDetails =
    document
      .getElementById("paymentDetails")
      .value;

  try {

    const response = await fetch(
      "/api/withdrawals",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "Authorization":
            `Bearer ${authToken}`
        },

        body: JSON.stringify({
          amount,
          method,
          paymentDetails
        })
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(data.message);
    }

    alert(
      "Withdrawal request submitted."
    );

    closeWithdraw();

    await loadWallet();

  } catch (error) {

    alert(
      error.message ||
      "Withdrawal failed"
    );

  }
}


/* =========================
   INITIALIZATION
========================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    loadWallet();

  }
);