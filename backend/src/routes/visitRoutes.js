const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/:patientId', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM visits WHERE patient_id = ? ORDER BY visit_date DESC',
      [req.params.patientId]
    );

    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/:patientId', async (req, res) => {
  try {
    const {
      visit_date,
      visit_type,
      note
    } = req.body;

    const [result] = await pool.query(
      `INSERT INTO visits
      (patient_id, visit_date, visit_type, note)
      VALUES (?, ?, ?, ?)`,
      [req.params.patientId, visit_date, visit_type, note]
    );

    res.status(201).json({
      message: 'Visit created',
      id: result.insertId
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
