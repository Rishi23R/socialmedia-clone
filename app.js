const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const databasePath = path.join(__dirname, "twitterClone.db");

const app = express();

const PORT = process.env.PORT || 3030;

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    app.listen(PORT, () => console.log(`Server Running at ${PORT}`));
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const convertUserDbObjectToResponseObject = (dbObject) => {
  return {
    userId: dbObject.user_id,
    userName: dbObject.username,
  };
};

const convertTweetDbObjectToResponseObject = (dbObject) => {
  return {
    tweetId: dbObject.tweet_id,
    tweet: dbObject.tweet,
    userId: dbObject.user_id,
    dateTime: dbObject.date_time,
  };
};

function authenticateToken(request, response, next) {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
}

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const databaseUser = await database.get(selectUserQuery);
  if (databaseUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      password,
      databaseUser.password
    );
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

app.get("/user/:userId", authenticateToken, async (request, response) => {
  const { userId } = request.params;

  const getUserQuery = `
    SELECT
      username,password,gender
    FROM
      user
      where user_id=${userId};`;
  const user = await database.get(getUserQuery);
  response.send(convertUserDbObjectToResponseObject(user));
});

app.post("/tweets/", authenticateToken, async (request, response) => {
  const { tweet, userId } = request.body;
  const postTweetQuery = `
  INSERT INTO
    tweet (tweet,user_id)
  VALUES
    (${tweet}, '${userId}');`;
  await database.run(postTweetQuery);
  response.send("Tweet Successfully Added");
});

app.delete(
  "/tweets/:tweetId/",
  authenticateToken,
  async (request, response) => {
    const { tweetId } = request.params;
    const deleteDistrictQuery = `
  DELETE FROM
    district
  WHERE
    tweet_id = ${tweetId} 
  `;
    await database.run(deleteTweetQuery);
    response.send("Tweet Removed");
  }
);

app.get("/tweets/", authenticateToken, async (request, response) => {
  const getTweetsQuery = `
    SELECT
      *
    FROM
     tweets
    order by date_time;`;
  const tweet = await database.get(getTweetsQuery);
  response.send(convertTweetDbObjectToResponseObject(tweet));
});

module.exports = app;
