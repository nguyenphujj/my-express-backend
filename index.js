const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;

//this is to allow requests from the frontend
const cors = require('cors');
app.use(cors());

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







app.post("/authVer2", (req, res) => {
  const { password } = req.body;//extract password from request

  let user = {};
  if (password === "123") {
    user = { id: 42, username: "alice", role: "user" };//create an object
  } else if (password === "321") {
    user = { id: 0, username: "admin", role: "admin" };//create an object
  } else {
    return res.status(401).json({ error: "Invalid password" });
  }

  const token = jwt.sign(user, JWT_SECRET, { expiresIn: 100 });//sign the object and store it in 'token'
  res.json({ token, user });//respond with 'token' and 'user'
});

function authenticateTokenVer2(req, res, next) {//middleware to decrypt token
  const header = req.headers.authorization;//take authorization from headers from request
  if (!header) return res.status(401).json({ error: "No token" });//if it is null => error

  const token = header.split(" ")[1];//else, extract the 'token' in ""
  try {
    const decoded = jwt.verify(token, JWT_SECRET);//decrypt the 'token' with JWT_SECRET
    req.user = decoded;//req.user will look like this { id: 42, name: 'alice', iat: 1758967261, exp: 1758967361 }
      //jwt.verify doesn't care the name alice or bob, it only cares if it can decode the token, if can => valid token, if cannot => invalid
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
}

function checkIfAdmin(req, res, next) {//middleware to detect user role
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Admins only" });
  next();
}

//DEPENDING ON: authenticateTokenVer2, checkIfAdmin
//this endpoint is for admin only
app.get("/foradmin", authenticateTokenVer2, checkIfAdmin, (req, res) => {
  res.json({ message: `Welcome, ${req.user.username}. This is admin-only.` });
});

// Track request counts per user
//this will keep count as long as backend won't restart
//if backend restarts, this count will be lost, so if you want it to be permanent, you need to keep it in database
//you can request the entire database and store it in a backend variable, but remember to push data back to database before updating your backend, because updating backend will reset the backend
const requestCount = {};//if you write requestCount = 0, then it can't distinguish between users, every request increments the same counter
  //CONST does not make the value immutable, it only means the binding (the variable name) cannot be reassigned

  
//DEPENDING ON: auth
app.get("/requestcount", authenticateTokenVer2, (req, res) => {
  //after authenticateToken, now you have all the information of the user, like id name role, now you can check those information to grant them access to specific part of your web
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
    const result = await pool.query("SELECT * FROM users");
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
    await pool.query("INSERT INTO users (name, message) VALUES ($1, $2)", [
      "alice",
      message,
    ]);
    res.status(201).json({ success: true });
  } catch (err) {
    console.error("DB insert error:", err);
    res.status(500).json({ error: "Database error" });
  }
});





const systemPrompt = fs.readFileSync("systemprompt.txt", "utf-8");
    console.log("sytemPrompt: \n{\n" + systemPrompt + "\n}");
app.post("/api/chat", async (req, res) => {
  try {
    const userPrompt = req.body.prompt;

    if (!userPrompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    // Define your system prompt
    const systemPrompt = fs.readFileSync("systemprompt.txt", "utf-8");

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
        
      },
      body: JSON.stringify({
        model: "gpt-5-mini", //gpt-4o-mini, gpt-5-mini
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