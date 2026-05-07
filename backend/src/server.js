require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'paliativeKSP API',
    timestamp: new Date()
  });
});

app.get('/api', (req, res) => {
  res.json({
    message: 'Welcome to paliativeKSP API'
  });
});

app.get('/api/patients', (req, res) => {
  res.json([
    {
      id: 1,
      hn: '6500001',
      fullname: 'Demo Patient',
      palliative_status: 'active'
    }
  ]);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
