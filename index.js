const express = require('express');
const app = express();
const PORT = 5001;

//this is to allow requests from the frontend
const cors = require('cors');
app.use(cors());

const fs = require('fs');

// Middleware
app.use(express.json());





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






// Example route
app.get('/', (req, res) => {
res.json({ message: 'Hello from the 5001!' });
});

// Start server
app.listen(PORT, () => {
console.log(`Server is running on http://localhost:${PORT}`);
});