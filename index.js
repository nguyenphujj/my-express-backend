//////////////////////////////////////////////
///////////////////////BACKEND
const express = require('express');
const app = express();
const PORT = process.env.PORT || 5001;

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

// Middleware
app.use(express.json());

function safeEval(expr) {
  // Only allow numbers, +, -, *, /, parentheses, decimal points, and spaces
  if (!/^[\d+\-*/().\s]+$/.test(expr)) {
    throw new Error('Invalid characters in expression');
  }
  // eslint-disable-next-line no-eval
  return Function('"use strict";return (' + expr + ')')();
}
app.post('/calculate', (req, res) => {
  const { expr } = req.body;
  if (!expr) {
    return res.status(400).json({ error: 'No expression provided' });
  }
  try {
    const result = safeEval(expr);
    res.json({ result: result.toString() });
  } catch (err) {
    res.json({ error: 'Invalid expression' });
  }
});

// Example route
app.get('/', (req, res) => {
  res.json({ message: 'Hello from render' });
});

// Start server
app.listen(PORT, () => {
console.log(`Server is running on http://localhost:${PORT}`);
});
