const express = require("express");
const app = express();
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
app.use(express.json());

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

let db = null;
let dbpath = path.join(__dirname, "twitterClone.db");

const initliseandconnectdb = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server running at http://loclhost:3000/");
    });
  } catch (e) {
    console.log(`Error:${e.message};`);
    process.exit(1);
  }
};

initliseandconnectdb();

const authenticationToken = async (request, response, next) => {
  let jwtToken;
  const authheader = request.headers["authorization"];
  if (authheader !== undefined) {
    jwtToken = authheader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "Sandeep", async (error, payload) => {
      if (error) {
        response.send(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};

/*  API 1 */

app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;
  const hashedpassword = await bcrypt.hash(password, 10);
  const userDetailsQry = `
    SELECT * FROM user WHERE username = '${username}';`;

  const userDetailsResponse = await db.get(userDetailsQry);

  if (userDetailsResponse !== undefined) {
    response.status(400);
    response.send("User already exists");
  } else {
    if (password.length < 6) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const insertQry = `INSERT INTO user(username,password,name,gender)
            VALUES(
                '${username}',
                '${hashedpassword}',
                '${name}',
                '${gender}'
            )`;
      const insertQryRes = await db.run(insertQry);
      response.status(200);
      response.send("User created successfully");
    }
  }
});

/*  API  2 */

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUser = `SELECT * FROM user WHERE username = '${username}';`;
  const userDetails = await db.get(selectUser);

  if (userDetails === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const ispasswordMatched = await bcrypt.compare(
      password,
      userDetails.password
    );
    if (ispasswordMatched === false) {
      response.status(400);
      response.send("Invalid password");
    } else {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "Sandeep");
      response.send({ jwtToken });
    }
  }
});

/*  API 3 */

app.get(
  "/user/tweets/feed/",
  authenticationToken,
  async (request, response) => {
    const { username } = request;

    const userIdQry = `SELECT user_id FROM user WHERE username = '${username}';`;
    const userIdresponse = await db.get(userIdQry);
    /*response.send(userIdresponse)*/

    const followerQry = `SELECT following_user_id FROM follower 
    WHERE follower_user_id = '${userIdresponse.user_id}
    ';`;
    const followerResponse = await db.all(followerQry);
    response.send(followerResponse);

    const tweetQry = `SELECT * FROM tweet 
    WHERE user_id = '${followerResponse.following_user_id}';`;

    const tweetResponse = await db.all(tweetQry);
    response.send(tweetResponse);
  }
);

module.exports = app;
