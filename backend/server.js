require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const chatRoutes = require('./routes/chat');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'TaskTock API running', version: '1.0.0' });
});

app.use('/auth', authRoutes);
app.use('/tasks', taskRoutes);
app.use('/chat', chatRoutes);

app.listen(PORT, () => {
  console.log(`\n  TaskTock API → http://localhost:${PORT}\n`);
});
