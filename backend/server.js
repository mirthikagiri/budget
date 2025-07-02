// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const mongoose = require('mongoose');


const MONGO_URI='mongodb://127.0.0.1:27017/Budget';
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('MongoDB connected');
})
.catch(err => {
  console.error('MongoDB connection error:', err);
});



// Update Expense schema to include username
const expenseschema= new mongoose.Schema({
  username: String,
  category: String,
  title: String,
  amount: Number 
});

const Expense = mongoose.model('Expense', expenseschema);

const userSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    password: String
  });
  const User = mongoose.model('User', userSchema);

// Add schema for user settings (daily limit, income)
const userSettingsSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  income: Number,
  dailyLimit: Number
});
const UserSettings = mongoose.model('UserSettings', userSettingsSchema);



 const app = express(); 
  app.use(cors());
 
  // Update POST /api/expenses to require username and filter by user/category
  app.post('/api/expenses', express.json(), async (req, res) => {
    const { username, category, title, amount } = req.body;
    if (!username || !category || !title || !amount) {
      return res.status(400).json({ error: 'Missing fields.' });
    }
    const expense = new Expense({ username, category, title, amount });
    try {
      await expense.save();
      res.status(201).json({ message: 'Expense added' });
    } catch (error) {
      console.error('Error saving expense:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update GET /api/expenses to filter by username and category
  app.get('/api/expenses', async (req, res) => {
    const { username, category } = req.query;
    if (!username || !category) {
      return res.status(400).json({ error: 'Missing username or category.' });
    }
    try {
      const expenses = await Expense.find({ username, category });
      res.status(200).json(expenses);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });   

  app.put('/api/expenses/:id', express.json(), async (req, res) => {
    const { id } = req.params;
    const { category, title, amount } = req.body;
    try {
      const updatedExpense = await Expense.findByIdAndUpdate(
        id,
        {title, amount },
        { new: true }
      );
      if (!updatedExpense) {
        return res.status(404).json({ error: 'Expense not found' });
      }
      res.status(200).json(updatedExpense);
    } catch (error) {
      console.error('Error updating expense:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  // Update DELETE /api/expenses/:id to require username (optional, for security)
  app.delete('/api/expenses/:id', async (req, res) => {
    try {
      const id = req.params.id;
      await Expense.findByIdAndDelete(id);
      res.status(204).end();
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: err.message });
    }
  })

app.post('/api/login', express.json(), async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required.' });
  }
  try {
    let user = await User.findOne({ username });
    if (!user) {
      // Register new user
      user = new User({ username, password });
      await user.save();
      return res.status(201).json({ message: 'User registered and logged in.' });
    } else {
      // Check password
      if (user.password === password) {
        return res.status(200).json({ message: 'Login successful.' });
      } else {
        return res.status(401).json({ error: 'Invalid password.' });
      }
    }
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// Endpoint to get user settings
app.get('/api/user-settings', async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'Missing username.' });
  try {
    let settings = await UserSettings.findOne({ username });
    if (!settings) return res.status(404).json({ error: 'Settings not found.' });
    res.status(200).json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
// Endpoint to set/update user settings (income, dailyLimit)
app.post('/api/user-settings', express.json(), async (req, res) => {
  const { username, income, dailyLimit } = req.body;
  if (!username || income === undefined || dailyLimit === undefined) {
    return res.status(400).json({ error: 'Missing fields.' });
  }
  try {
    let settings = await UserSettings.findOneAndUpdate(
      { username },
      { income, dailyLimit },
      { new: true, upsert: true }
    );
    res.status(200).json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- AI Assistance Endpoint (Gemini, Raw HTTP) ---
app.post('/api/ai-assist', express.json(), async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) return res.status(400).json({ error: 'Missing prompt.' });

  const apiKey = process.env.GEMINI_API_KEY;
  // Use v1beta endpoint and a v1beta model (gemini-2.0-flash or gemini-2.0-pro)
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey;

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `You are a personal budget assistant. ${prompt}`
          }
        ]
      }
    ]
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    // Log full response
    console.log("🔍 Gemini API raw response:", JSON.stringify(data, null, 2));

    if (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) {
      res.json({ response: data.candidates[0].content.parts[0].text });
    } else {
      res.status(500).json({ error: "Gemini did not return a valid response." });
    }
  } catch (error) {
    console.error("AI error:", error);
    res.status(500).json({ error: "Gemini API error." });
  }
});

  const PORT = 5000;
  app.listen(PORT, () => {     
    console.log(`Server is running on http://localhost:${PORT}`);
  });
