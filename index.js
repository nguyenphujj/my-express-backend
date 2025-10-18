const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;

//this is to allow requests from the frontend
const cors = require('cors');
//app.use(cors());
app.use(cors({ origin: "*" }));//if you use the line above, android browser may not work with gpt api

const allowedOrigins = [
  "http://localhost:5173", // local dev
  "https://my-express-backend-gyj9.onrender.com" // replace with your actual frontend Render URL
];
app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

const fs = require('fs');

// Middleware
app.use(express.json());





//make sure you have installed dotenv
//make sure you add this ```  Bearer ${OPENAI_API_KEY}  ``` to the authorization below
require('dotenv').config();
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
//the purpose of this is to hide your api keys from your source code
//and more importantly, to make github allow you to push your backend to github, otherwise it will report error, and solving this error is very complicated
//the keys will stay in the env file, and the env file will never be pushed to github, but it will be added to environment in render












const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.OPENAI_API_KEY; // Use env var in production

//this is to grant token to frontend
app.post('/auth-passcode', (req, res) => {
  const { passcode } = req.body;
  if (passcode === '23') {
    const token = jwt.sign({ id: 42, name: "alice" }, JWT_SECRET, { expiresIn: 100 }); //10 means 10 seconds
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Invalid passcode' });
  }
});

//this is to verify token from frontend
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];  //this is to take the authorization key from headers from json from request from frontend
  const token = authHeader && authHeader.split(' ')[1]; //this is to extract the token from the authorization
  if (token == null) return res.sendStatus(401);  //if token is empty, respond error

  //else, verify the token based on jwt_secret, if fail => err, if success => creates *user, grant request.user to be *user
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}




//every endpoint has to verify 3 things:
//user
//user role
//number of requests






//✅✅✅✅THIS IS WHERE TOKEN IS CREATED, THE MOST IMPORTANT ENTRY POINT
//IMPORTANT, this endpoint is protected by default because it is app.post not app.get
//if you change it into app.get and add this line `return res.json({ message: 'Hello from render' });`
//then it can be accessed from browser
//if you only change it to app.get, it will throw a lot of errors if accessed from browser
app.post("/authVer2", (req, res) => {
  //req stands for DataStreamFromFrontend
  //"req" is arbitrary, you can name it anything, it will still mean DataStreamFromFrontend
  //in DataStreamFromFrontend, there are "headers" and "body"
  const { password } = req.body;//extract password from DataStreamFromFrontend "body"
  //"password" is not arbitrary, is it written {password} because the text inside DataStreamFromFrontend.body is {password}
  //if you write it as something else like {passcode}, it will not work
  //this is the important linker between frontend and backend, so it has to match with frontend
  //the other important linker is at res.json, where backend responds to frontend, and in frontend
  // there has to be matching variables

  let user = {};
  if (password === "123") {
    user = { id: 42, username: "alice", role: "user" };//create an object
  } else if (password === "321") {
    user = { id: 1, username: "admin", role: "admin" };//create an object
  } else {
    return res.status(401).json({ error: "Invalid password" });
    //IMPORTANT: when deploy (production), you may wanna remove "status" from this line res.status(401).json
    //because it will leak the backend url in frontend devtools when user causes error, like wrong password
    //but you can never hide it completely, the url will still appear somewhere in devtools (network tab)
  }

  //IMPORTANT: when you reduce the expire time, previously created tokens will still work
  //for example, a 1d-token will still work after you update your backend with new expire time = 10s
  //to revoke all of the tokens signed, you can simply change your JWT_SECRET, then all the created tokens will be invalid
  const token = jwt.sign(user, JWT_SECRET, { expiresIn: 1000 /*seconds*/});//sign the object and store it in 'token'
  res.json({ token, user });
  //res.json is the DataStreamFromBackend
  //"token" and "user" are the output linkers
  //so in frontend, the variables must be named data.token and data.user
  // in order to extract the values from the output linkers
});

//✅✅✅✅THIS IS WHERE USER IS VERIFIED AFTER THEY HAVE SIGNED IN, THE SECOND MOST IMPORTANT CHECKPOINT
function authenticateTokenVer2(req, res, next) {//middleware to decrypt token
  const header = req.headers.authorization;//take authorization from headers from request
  if (!header) return res.status(401).json({ error: "No token" });//if it is null => error

  const token = header.split(" ")[1];//else, extract the 'token' in ""
  try {
    const decoded = jwt.verify(token, JWT_SECRET);//decrypt the 'token', using JWT_SECRET as a password
    //"decoded" contains whatever was encoded, so "decoded" will look like this
    //{ id: 42, name: 'alice', role: "user", iat: 1758967261, exp: 1758967361 }
    //jwt.verify doesn't care if the name is alice or bob, it only cares if it can decode or not, if can => valid, if cannot => invalid
    req.user = decoded;
    //"user" is what you append to req, you can append anything, you can write `req.haha = 0`
    //just make sure that in further processes after this middleware, you need to call req.haha to use it
    //req is globally available, but req.haha is only available after this middleware
    //after this middleware, req will have req.headers, req.body, and req.user (or req.haha)
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
}

//✅✅✅✅THIS IS WHERE USER IS VERIFIED IF THEY ARE ADMIN
function checkIfAdmin(req, res, next) {//middleware to detect user role
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Admins only" });
  next();
}

//request count, version 2
let userRequestCount = {};
let mylimit = 15;
//✅✅✅✅THIS IS WHERE USER REQUEST IS COUNTED
function checkNumberOfRequests(req, res, next) {
  const userId = req.user.id;
  //to use user's ip, use this code ```const user = req.ip;```

  if (!userRequestCount[userId]) {
    userRequestCount[userId] = 0;
  }//or this code ```userRequestCount[userId] = (userRequestCount[userId] || 0) + 1;```

  userRequestCount[userId]++;
  //res.send(`You have made ${userRequestCount[userId]} requests`);
  if (userRequestCount[userId] > mylimit) {
    return res.status(429).json({ error: "Too many requests" });
    //when you write "return", it means user request only reaches this point, no further backend processes
    //so if user requests, say > 5, backend will stop them right here, they have to return
    // they can't enter the next checkpoint/endpoint
    //you can write it like this res.json, without "return", but then there shouldn't be any res.json below it
    // or it will cause the double response error
  }
  next();
}




//DEPENDING ON: authenticateTokenVer2, checkIfAdmin, checkNumberOfRequests
//this is example endpoint for "admin only"
app.get("/foradmin", authenticateTokenVer2, checkIfAdmin, checkNumberOfRequests, (req, res) => {
  res.json({ message: `Welcome, ${req.user.username}. This is admin-only.` });
});



//THIS IS AUTHVER3
//it features username and password
  const userArray = [//new3.
    { id: 1, username: "admin", password: "321", role: "admin", realname: "nxp" },
    { id: 41, username: "alice", password: "123", role: "user", realname: "nxp" },
    { id: 42, username: "bob", password: "456", role: "user", realname: "nxp" },
    { id: 43, username: "carl", password: "789", role: "user", realname: "nxp" },
    { id: 501, username: "u0125", password: "563g43ff", role: "user", realname: "tc anh" },
  ];
  app.post("/authVer3", (req, res) => {
    const { username, password } = req.body;
    const usernameinput = username
    const passwordinput = password
    //frontend must send "usernameinput" and "passwordinput"

    const myuser = userArray.find(u => u.username === usernameinput);//this loops u.username
    //and stores the whole user into myuser

    if (!myuser || myuser.password !== passwordinput) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const payload = {
      id: myuser.id,
      username: myuser.username,
      role: myuser.role
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });

    const user = payload
    res.json({ user, token });
  });
//









// Track request counts per user
//this will keep count as long as backend won't restart
//if backend restarts, this count will be lost, so if you want it to be permanent, you need to keep it in database
//you can request the entire database and store it in a backend variable
// but remember to push data back to database before updating your backend, because updating backend will reset the backend
const requestCount = {};//if you write requestCount = 0, then it can't distinguish between users, every request increments the same counter
//CONST does not make the value immutable, it only means the binding (the variable name) cannot be reassigned

//DEPENDING ON: auth
app.get("/requestcount", authenticateTokenVer2, (req, res) => {
  //after authenticateToken, now you have all the information of the user
  // like id name role, now you can check those information to grant them access to specific part of your web
  //all information of the user is stored in "req.user"
  //a user is determined by their id, not their name so you should use their id here
  const userId = req.user.id;//userId = 42
  //req.user is a global variable, you can access it everywhere, even if you change it to haha.user, it still works

  if (!requestCount[userId]) requestCount[userId] = 0;//if requestCount[42] == null, requestCount[42] = 0

  if (requestCount[userId] >= 3) {//if requestCount[42] >= 3 => error
    return res.status(429).json({ error: "Request limit reached" });
  }

  requestCount[userId] += 1;//else, requestCount[42]++
  //this will keep count as long as backend won't restart

  res.json({//hello alice, this is request #1
    message: `Hello ${req.user.name}! This is request #${requestCount[userId]}`
  });
});




















//DEPENDING ON (maybe): authenticateToken
app.post('/calculate', authenticateToken, (req, res) => {
  const { expr } = req.body;
  if (!expr) {
    return res.status(400).json({ error: 'No expression provided' });
  }
  try {
    const result = eval(expr);
    res.json({ result: result.toString() });
  } catch (err) {
    res.json({ error: 'Invalid expression' });
  }
});





app.get('/conversations', (req, res) => {
  fs.readFile('conversation.json', 'utf8', (err, data) => {
    if (err) {
      res.status(500).send('Error reading conversation file');
    } else {
      res.json(JSON.parse(data));
    }
  });
});

app.post('/save-myjson', (req, res) => {
  const data = req.body;
  fs.writeFile('myjson.json', JSON.stringify(data, null, 2), (err) => {
    if (err) {
      res.status(500).send('Error saving myjson');
    } else {
      res.json({ message: 'myjson saved successfully' });
    }
  });
});








const { Pool } = require('pg');

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true }, // Render requires SSL
});

// API endpoint to get users
app.get("/users", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM stprompt");
    res.json(result.rows); // send rows as JSON
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// API endpoint to insert message
app.post("/messages", async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  try {
    await pool.query("UPDATE stprompt SET systemprompt = $1 WHERE id = 2", [
      message,
    ]);
    res.status(201).json({ success: true });
  } catch (err) {
    console.error("DB insert error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

//derived from /messages
//this endpoint is to send data to db only, not to receive data from db
app.post("/admin-update-systemprompt", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required" });
  try {
    await pool.query(
      'UPDATE tableprompt SET columnsubject = $1, columnprompt = $2 WHERE id = $3',
      ['math', message, 1]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    console.error("DB insert error:", err);
    res.status(500).json({ error: "Database error" });
  }
});
//to update one cell only, use this code, remember to check id
// await pool.query("UPDATE stprompt SET systemprompt = $1 WHERE id = 2", [message,]);

//derived from /users
//this endpoint is to get from db only, not to send to db
app.get("/admin-to-get-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM tableprompt");
    res.json(result.rows);//there must be .rows to access the json array we need
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});



//this function doesn't run by itself, it needs to be called below to run
async function fetchInitialData() {
  /* try {
    const table1 = await pool.query("SELECT * FROM stprompt");
    global.table1 = table1.rows;
    console.log(global.table1)
  } catch {
    global.table1 = [];
  } */
  try {
    const vartableprompt = await pool.query("SELECT * FROM tableprompt");
    global.vartableprompt = vartableprompt.rows;//global.mytable can be accessed anywhere in backend code
    //.rows so that it will access the rows array in global.vartableprompt
    //otherwise it will assign the entire long response
    // console.log(global.vartableprompt);
  } catch {
    global.vartableprompt = [];
  }
}
//IMPORTANT: this function will make a call to postgres every time backend starts
fetchInitialData();
//IMPORTANT, this will keep the function fetch run every 1 minute forever
// setInterval(fetchInitialData, 1*60*1000);



let num = 1
//IMPORTANT: this code will keep running forever
setInterval(() => {
  console.log(`time elapsed ${num++} minutes`);
  //you can add more code here
}, 1 * 60 * 1000);//miliseconds, it will wait the time first, then run the code





//for SYSTEMPROMPT for txt file, we don't need this txt file anymore, since render can't access this local txt
//const globalLocalSystemPrompt = fs.readFileSync("systemprompt.txt", "utf-8");
//console.log("sytemPrompt: \n{\n" + globalLocalSystemPrompt + "\n}");

//SYSTEMPROMPT, this is for systemprompt, fetching from postgres
//all of this code is to make dbSystemPrompt = global.vartableprompt[0].columnprompt
//but since global.vartableprompt is not available at the beginning
//so we have to wait until it's available
//so we have to wait for 5 seconds
//but we also need to make this setInterval only run once, not every 5 seconds
//after all, this code is badly written, you can easily to shorten it
//TIPS, put dbSystemPrompt inside "try" together with globalvariable
let dbSystemPrompt = 0; let runcount = 0; const maxrunCount = 1;
const intervalId = setInterval(() => {
  if (runcount++ < maxrunCount) {
    dbSystemPrompt = global.vartableprompt[0]?.columnprompt || "state that your name is Empty before answering";
    //IMPORTANT, question mark and OR is for in case you forget to push systemprompt to db, otherwise backend will throw error
    console.log(`dbSystemPrompt=========================\n${dbSystemPrompt}\n=======================================`)
  } else clearInterval(intervalId);
}, 5_000);
//you should wait for this console.log to run before making any gpt request

app.post("/api/chat", async (req, res) => {
  try {
    const userPrompt = req.body.prompt;

    if (!userPrompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    //DEFINE YOUR SYSTEM PROMPT
    const systemPrompt = 'globalLocalSystemPrompt';

    // Create the messages array (system + user)
    const finalPrompt = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    // Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", //gpt-4o-mini, gpt-5-mini
        messages: finalPrompt,
      }),
    });

    const data = await response.json();

    // Extract assistant's reply
    const reply = data.choices?.[0]?.message?.content || "No response from model.";

    const now = new Date();
    const timestamp = now.toLocaleString(); // formatted based on your system locale
    console.log(`${timestamp} ` + "Model:", data.model || "Unknown");
    if (data.usage) {
      console.log("Tokens Used:");
      console.log("  Prompt tokens:", data.usage.prompt_tokens);
      console.log("  Completion tokens:", data.usage.completion_tokens);
      console.log("  Total tokens:", data.usage.total_tokens);
    } else {
      console.log("No token usage info available.");
    }

    res.json({ reply });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
});







//if you wanna store the systemprompt in env of render or in local env
//this is the way to access systemprompt
// const envSystemPrompt = process.env.SYSTEMPROMPT;
//this method is like using txt file but different because render can't access txt file
//but can access env file


//NON-STREAMING VERSION, IF YOU WANNA USE THIS ENDPOINT, PLEASE DISABLE THE STREAMING VERSION
//MAKE SURE IT GOES WITH THE NON-STREAMING VERSION IN FRONTEND TOO
//derived from /api/chat
//this gpt endpoint is for you admin, you can ask anything
//you can change the model below to make it smarter
//but it also has promptCounter to simulate real user interactions
app.post("/gpt-non-streaming",//new4
  authenticateTokenVer2, checkIfAdmin, checkNumberOfRequests, async (req, res) => {
  try {
    const userPrompt = req.body.prompt;

    //req.user is only available if middleware is added to this endpoint
    //else, this line will be invalid
    console.log(`<< ${req.user.username} (role:${req.user.role}) is making request ${userRequestCount[req.user.id]}/${mylimit}`)

    if (!userPrompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    //IMPORTANT => make sure SYSTEMPROMPT and MODEL are correct
    // to make sure the systemprompt is correct
    //include a version number in the systemprompt
    //then ask the model to tell you the version number, if matched, then the systemprompt is handled properly
    //besides, you can always console.log to view the systemprompt
    //if the systemprompt is not correct, check following precautions
    // have you sent systemprompt to db, restarted your backend after sending so it can fetch the new systemprompt
    // check your systemprompt source, is the source correct
    const systemPrompt = 'dbSystemPrompt';
    console.log("THE FINAL SYSTEMPROMPT is: " + systemPrompt)
    // Create the messages array (system + user)
    const finalPrompt = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    // Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", //gpt-4o-mini, gpt-5-mini
        messages: finalPrompt,
      }),
    });

    const data = await response.json();

    // Extract assistant's reply
    const reply = data.choices?.[0]?.message?.content || "No response from model.";

    const now = new Date();
    const timestamp = now.toLocaleString(); // formatted based on your system locale
    console.log(`${timestamp} ` + "Model:", data.model || "Unknown");
    if (data.usage) {
      console.log("Tokens Used:");
      console.log("  Prompt tokens:", data.usage.prompt_tokens);
      console.log("  Completion tokens:", data.usage.completion_tokens);
      console.log("  Total tokens:", data.usage.total_tokens);
    } else {
      console.log("No token usage info available.");
    }

    res.json({ reply });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

//THE STREAMING VERSION, the purpose of this is to prevent waiting timeout due to long response
//MAKE SURE IT GOES WITH THE STREAMING VERSION IN FRONTEND, AND DISABLE THE NON-STREAMING IN BACKEND TOO
app.post(
  "/gpt-streaming",//new4
  authenticateTokenVer2,
  checkIfAdmin,
  checkNumberOfRequests,
  async (req, res) => {
    try {
      const userPrompt = req.body.prompt;
      if (!userPrompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }
      await pool.query('INSERT INTO tableChat (columnSender, columnContent) VALUES ($1, $2)',
        ['user', userPrompt]);

      const systemPrompt = dbSystemPrompt;
      console.log(dbSystemPrompt);
      const finalPrompt = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ];

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",//MODEL IS HEREEEEEEEEEEEEEEEEEEEEEEEE
          messages: finalPrompt,
          stream: true, // <-- IMPORTANT
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("OpenAI error:", text);
        return res.status(500).end("Error from OpenAI");
      }

      let fullResponse = "";
      let buffer = ""; // 👈 hold incomplete data chunks
      const decoder = new TextDecoder();

      for await (const chunk of response.body) {
        const decoded = decoder.decode(chunk, { stream: true });
        buffer += decoded; // accumulate

        // Split on newlines (standard for SSE)
        const lines = buffer.split("\n");

        // Keep last partial line in buffer (not yet complete)
        buffer = lines.pop();

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;

          const data = trimmed.replace(/^data:\s*/, "");

          if (data === "[DONE]") {
            res.write("event: done\ndata: [DONE]\n\n");
            console.log("<>", /* fullResponse */);
            await pool.query(
              'INSERT INTO tableChat (columnSender, columnContent) VALUES ($1, $2)',
              ['api', fullResponse]
            );
            console.log("<>");
            return res.end();
          }

          try {
            const json = JSON.parse(data);
            const token = json.choices?.[0]?.delta?.content;
            if (token) {
              fullResponse += token;
              res.write(`data: ${JSON.stringify({ token })}\n\n`);
            }
          } catch (err) {
            // Just ignore incomplete lines (they’ll be completed in next chunk)
            if (!(err instanceof SyntaxError)) console.error("Unexpected error:", err);
          }
        }
      }

      // optional: handle leftover buffer
      if (buffer.trim() !== "") {
        console.warn("Unparsed buffer at end:", buffer);
      }
    } catch (error) {
      console.error("Backend streaming error:", error);
      res.status(500).end("Something went wrong.");
    }
  }
);







//ALL OF THIS IS FOR WEBSOCKET
  //this is to solve the "unable to stream" issue on android
  //  which the "streaming version" endpoint can't solve
  //this has a dedicated component in frontend
  //and this has to go with that component, in order to make everything work
  const http = require('http');
  const WebSocket = require('ws');
  const { URL } = require('url');
  app.get('/health', (req, res) => res.json({ ok: true }));
  const server = http.createServer(app);
  // const wss = new WebSocket.Server({ server });  //old version
  const wss = new WebSocket.Server({ server, path: "/ws" });  //modified








  ////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //this is the Simulated Middleware System
  //since websocket doesn't support middlewares like endpoints
  //so we need these functions to simulate middlewares
  //and this is the MIDDLEWARE MASTER
  // which controls the three sub-middlewares below
    const applyMiddlewares = async (ws, req, middlewares) => {
      for (const mw of middlewares) {
        const result = await mw(ws, req);
        if (!result.success) {
          ws.send(JSON.stringify({ error: result.message }));
          ws.close();
          return false;
        }
      }
      return true;
    };
  //
  //and these are the three SUB-MIDDLEWARES
    //1️⃣1️⃣1️⃣1️⃣AUTHENTICATION
    const Auth_MW = async (ws, req) => {
      try {
        const token = req.url.split("token=")[1];

        if (!token) {
          return { success: false, message: "Missing token" };
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        ws.user = decoded;
        return { success: true };
      } catch (err) {
        return { success: false, message: "Invalid or expired token" };
      }
    };
    //2️⃣2️⃣2️⃣2️⃣CHECK IF ADMIN
    const checkIfAdmin_MW = async (ws, req) => {
      if (!ws.user?.isAdmin) {
        return { success: false, message: "Admin access required" };
      }
      return { success: true };
    };
    //3️⃣3️⃣3️⃣3️⃣REQUEST COUNT
    //since the result of this is {success}
    //in order to work with its result, you must
    //const result = (async requestCount_MW(ws, req)).success
    const reqCount = {}; // userId -> count
    const requestCount_MW = async (ws, req) => {
      const userId = ws.user?.id;
      if (!userId) return { success: false, message: "User not authenticated" };

      if (!reqCount[userId]) reqCount[userId] = 0
      const count = reqCount[userId];
      
      if (count >= 13) return { success: false, message: "Request limit reached" };

      return { success: true };
    };
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////











  // helper: call OpenAI streaming chat completions
  async function streamChatCompletions(userinput, modelfromfrontend /* = 'gpt-4o-mini' */, tokenfromfrontend, ws) {
    await pool.query(
      "INSERT INTO tableChat2 (colUserID, colSender, colMessage) VALUES ($1, 'user', $2)",
      [tokenfromfrontend, 'userinput']);

    const finalPrompt = [
      { role: "system", content: dbSystemPrompt },
      { role: "user", content: userinput },
    ];

    const body = {
      model: modelfromfrontend,//IMPORTANT, in this websocket code, the model option is decided in frontend, not backend
      messages: finalPrompt,
      stream: true,
    };

    // node-fetch v2 returns a body stream we can read from
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      ws.send(JSON.stringify({ type: 'error', message: `OpenAI error: ${res.status} ${text}` }));
      return;
    }

    // The streaming response is text/event-stream style with lines like: "data: {...}\n\n"
    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let completeResponse = ''; //modified, variable to store complete response

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // process any full events (separated by double newline)
      let parts = buffer.split(/\r?\n\r?\n/);
      // leave last partial chunk in buffer
      buffer = parts.pop();

      for (const part of parts) {
        // each part may contain multiple lines like:
        // data: {...}
        // data: {...}
        // or data: [DONE]
        const lines = part.split(/\r?\n/);
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (!trimmed.startsWith('data:')) continue;
          const payload = trimmed.replace(/^data:\s*/, '');

          if (payload === '[DONE]') {
            ws.send(JSON.stringify({ type: 'done' }));
            await pool.query(
              "INSERT INTO tableChat2 (colUserID, colSender, colMessage) VALUES ($1, 'bot', $2)",
              [tokenfromfrontend, 'completeResponse']);
            return;
          }

          let parsed;
          try {
            parsed = JSON.parse(payload);
          } catch (err) {
            // ignore non-json or forward raw
            ws.send(JSON.stringify({ type: 'error', message: 'could not parse chunk', raw: payload }));
            continue;
          }

          // defensive: check shape
          try {
            const choices = parsed.choices || [];
            if (choices.length > 0) {
              const delta = choices[0].delta || {};
              // Chat-style streaming may send {delta: {content: "hi"}}
              // For older endpoints sometimes it's choices[0].text
              const content = delta.content ?? choices[0].text ?? '';
              if (content) {
                ws.send(JSON.stringify({ type: 'delta', content }));
                completeResponse += content; // Accumulate the response content
              }
            }
          } catch (err) {
            ws.send(JSON.stringify({ type: 'error', message: 'error extracting delta', detail: String(err) }));
          }
        }
      }
    }
    // if we exit loop without [DONE], send done
    ws.send(JSON.stringify({ type: 'done' }));
  }

  //WEBSOCKET MAINNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN
  wss.on('connection', async (ws, req) => {
    const token = req.url.split("token=")[1];
    console.log("GATE1 user token is: "+token);//new2, everytime user signs in, this line runs
      //if or there is token and user reloads page

    const middlewares = [Auth_MW, requestCount_MW];

    // If connecting to admin route, add admin middleware
    if (req.url.startsWith("/admin")) {
      middlewares.push(checkIfAdmin_MW);
    }

    const ok = await applyMiddlewares(ws, req, middlewares);
    if (!ok) return; // closed already if failed
    console.log("GATE2 the user is: ",ws.user)//new2, must be comma not plus

    // ✅ Connection accepted
    ws.send(JSON.stringify({ message: "WebSocket connection established" }));

    ws.on('message', async (payloadfromfrontend) => {//THIS IS where it receives payload sent from frontend, like req
      // Expect a JSON message from client
      let parsed;
      try {
        parsed = JSON.parse(payloadfromfrontend);
      } catch (err) {
        ws.send(JSON.stringify({ type: 'error', message: 'invalid json' }));
        return;
      }

      if (parsed.type === 'start') {
        const { messages, model } = parsed;
        if (!messages /* || !Array.isArray(messages) */) {
          ws.send(JSON.stringify({ type: 'error', message: 'missing messages array' }));
          return;
        }

        try {
          console.log("HERE1 the reqCount is: " + reqCount[ws.user.id])//new1
          const isProceed = (await requestCount_MW(ws, req)).success//new1
          console.log("HERE2 is the user allowed to proceded: " + isProceed)//new1
          if (isProceed) {//new1 added if
            await streamChatCompletions(messages, model /* || 'gpt-4o-mini' */, ws.user.id, ws);
            console.log("HERE3 reqCount after chat is: " + ++reqCount[ws.user.id])//new1
          }else {//new1, if without this line, frontend will stay streaming forever
            ws.close(4001, "Invalid token");
            return;
          }
        } catch (err) {
          console.error('stream error', err);
          ws.send(JSON.stringify({ type: 'error', message: 'streaming failed', detail: String(err) }));
        }
      } else if (parsed.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      } else {
        ws.send(JSON.stringify({ type: 'error', message: 'unknown message type' }));
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected');
    });
  });
//









const multer = require("multer");
const upload = multer({ dest: "uploads/" });

app.post("/api/analyze-image", upload.single("image"), async (req, res) => {
  try {
    const filePath = req.file.path;
    const fileData = fs.readFileSync(filePath, { encoding: "base64" });

    // Send request to OpenAI Vision model
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-nano", //gpt-5-nano, gpt-4o-mini
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "respond with math problem in simple latex format, keep all its normal text" },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${fileData}` }
              }
            ],
          },
        ],
      }),
    });

    const data = await response.json();
    fs.unlinkSync(filePath); // cleanup temp file

    const now = new Date();
    const timestamp = now.toLocaleString(); // formatted based on your system locale
    console.log(`${timestamp} ` + "Model:", data.model || "Unknown");
    if (data.usage) {
      console.log("Tokens Used:");
      console.log("  Prompt tokens:", data.usage.prompt_tokens);
      console.log("  Completion tokens:", data.usage.completion_tokens);
      console.log("  Total tokens:", data.usage.total_tokens);
    } else {
      console.log("No token usage info available.");
    }
    

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const description = data.choices[0].message.content;
    res.json({ description });

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to analyze image" });
  }
});




// cs('hello')
function cs(aa) { console.log(aa) }
// cs('hello')
// cs(123)
// cs(true)

// let sum = 0
// for (let i = 1; i <= 1000; i++) {
//   sum += i
//   //cs(i)
// }
// cs(sum)

//if you change app.get into app.post
//it may not work at all
//since app.get only require params from url
//while app.post requires {method, headers, body}
//you should understand, and never swap app.get and app.post
//if you wanna use app.post
//  in frontend, there must be {method, headers, body}
//  in backend, const { frontendVar } = req.body
//if you wanna use an endpoint to call another endpoint, do the same

//below is very good example of how data flows from frontend => 1st endpoint => 2nd endpoint
//and flows back from 2nd endpoint => 1st endpoint => frontend

// Endpoint 1: called by frontend
app.post("/api/start", async (req, res) => {
  console.log("Frontend requested /api/start");
  const { delaysimulation } = req.body//step1: where 1st endpoint receives data from frontend
  cs("FIRST ENDPOINT: " + delaysimulation)

  try {
    // Call the slow endpoint
    const slowResponse = await fetch("http://localhost:5000/api/slow", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ delaysimulation }),//step2: where 1st endpoint sends data to 2nd endpoint
    });
    const data = await slowResponse.text();//step5: where 1st endpoint receives response from 2nd endpoint

    // Respond immediately after slow endpoint finishes
    res.send(`✅ Done waiting! Slow endpoint said: ${data}`);//step6: where 1st endpoint responds to frontend
  } catch (error) {
    console.error(error);
    res.status(500).send("Error calling slow endpoint");
  }
});

// Endpoint 2: slow response
app.post("/api/slow", async (req, res) => {
  console.log("Slow endpoint started — waiting 10 minutes...");
  const { delaysimulation } = req.body//step3: where 2nd endpoint receives data from 1st endpoint
  cs("SECOND ENDPOINT: " + delaysimulation)

  // Wait for 10 minutes (600000 ms)
  await new Promise((resolve) => setTimeout(resolve, delaysimulation));
  //4m30s is a safe waiting time to avoid timeout error
  //5m00s is still okay but dangerous

  console.log("Slow endpoint finished.");
  res.send("⏰ Finished after 10 minutes");//step4: where 2nd endpoint returns data to 1st endpoint
});


// endpoint1 proxies the streaming response to frontend
app.get("/endpoint1", async (req, res) => {
  const response = await fetch("http://localhost:5000/endpoint2");

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Transfer-Encoding", "chunked");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  async function streamChunks() {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      res.write(chunk); // send chunk immediately to frontend
    }
    res.end();
  }

  streamChunks();
});


// Simulate streaming data from endpoint2
app.get("/endpoint2", async (req, res) => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Transfer-Encoding", "chunked");

  const messages = ["Hello", "from", "endpoint2", "in", "chunks!"];

  setInterval(() => {
    res.write(`middle haha`);
  }, 2_000);

  for (let i = 0; i < 2; i++) {
    res.write(' ' + i + " ");
    await new Promise((r) => setTimeout(r, 1000)); // simulate delay.
  }

  res.end();
});


app.get('/', (req, res) => {
res.json({ message: 'Hello from render' });
});

//modified: old version is app.listen
server.listen(PORT, () => {
  const now = new Date();
  const timestamp = now.toLocaleString();
  console.log(`[${timestamp}] Server is running on http://localhost:${PORT}`);
});
