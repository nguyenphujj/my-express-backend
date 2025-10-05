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
const JWT_SECRET = 'your_secret_key_here'; // Use env var in production

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
    user = { id: 0, username: "admin", role: "admin" };//create an object
  } else {
    return res.status(401).json({ error: "Invalid password" });
    //IMPORTANT: when deploy (production), you may wanna remove "status" from this line res.status(401).json
    //because it will leak the backend url in frontend devtools when user causes error, like wrong password
    //but you can never hide it completely, the url will still appear somewhere in devtools (network tab)
  }

  //IMPORTANT: when you reduce the expire time, previously created tokens will still work
  //for example, a 1d-token will still work after you update your backend with new expire time = 10s
  //to revoke all of the tokens signed, you can simply change your JWT_SECRET, then all the created tokens will be invalid
  const token = jwt.sign(user, JWT_SECRET, { expiresIn: 100 /*seconds*/});//sign the object and store it in 'token'
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
  connectionString:
    "postgresql://my_pg_database_ie9q_user:bjyDS6jux3aSCDRQG8GQLVJGXlBPABBI@dpg-d33dk37diees739fs7qg-a.singapore-postgres.render.com/my_pg_database_ie9q",
  ssl: { rejectUnauthorized: false }, // Render requires SSL
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
    console.log(global.vartableprompt);
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
let dbSystemPrompt = 0; let runcount = 0; const maxrunCount = 1;
const intervalId = setInterval(() => {
  if (runcount++ < maxrunCount) {
    dbSystemPrompt = global.vartableprompt[0].columnprompt;
    console.log(dbSystemPrompt)
  } else clearInterval(intervalId);
}, 10000);

app.post("/api/chat", async (req, res) => {
  try {
    const userPrompt = req.body.prompt;

    if (!userPrompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    //DEFINE YOUR SYSTEM PROMPT
    const systemPrompt = globalLocalSystemPrompt;

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










//derived from /api/chat
//this gpt endpoint is for you admin, you can ask anything
//you can change the model below to make it smarter
//but it also has promptCounter to simulate real user interactions
app.post("/gptgeneralProtectedBackend",
  authenticateTokenVer2, checkIfAdmin, checkNumberOfRequests, async (req, res) => {
  try {
    const userPrompt = req.body.prompt;

    //req.user is only available if middleware is added to this endpoint
    //else, this line will be invalid
    console.log(`<< ${req.user.username} (role:${req.user.role}) is making request ${userRequestCount[req.user.id]}/${mylimit}`)

    if (!userPrompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    //DEFINE YOUR SYSTEM PROMPT
    const systemPrompt = "tell user that your version is 2025q1";

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










app.get('/', (req, res) => {
res.json({ message: 'Hello from render' });
});

app.listen(PORT, () => {
  const now = new Date();
  const timestamp = now.toLocaleString(); // formatted based on your system locale
  console.log(`[${timestamp}] Server is running on http://localhost:${PORT}`);
});