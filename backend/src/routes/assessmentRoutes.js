const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/:patientId', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM assessments WHERE patient_id = ? ORDER BY assessed_at DESC',
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
      pps_score,
      pain_score,
      esas_detail
    } = req.body;

    const [result] = await pool.query(
      `INSERT INTO assessments
      (patient_id, pps_score, pain_score, esas_detail)
      VALUES (?, ?, ?, ?)`,
      [req.params.patientId, pps_score, pain_score, esas_detail]
    );

    res.status(201).json({
      message: 'Assessment created',
      id: result.insertId
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
