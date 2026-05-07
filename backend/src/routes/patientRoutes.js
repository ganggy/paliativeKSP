const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM patients ORDER BY id DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM patients WHERE id = ?', [req.params.id]);

    if (!rows.length) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      hn,
      cid,
      fullname,
      birthdate,
      phone,
      address,
      diagnosis,
      palliative_status
    } = req.body;

    const [result] = await pool.query(
      `INSERT INTO patients
      (hn, cid, fullname, birthdate, phone, address, diagnosis, palliative_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [hn, cid, fullname, birthdate, phone, address, diagnosis, palliative_status]
    );

    res.status(201).json({
      message: 'Patient created',
      id: result.insertId
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const {
      fullname,
      phone,
      address,
      diagnosis,
      palliative_status
    } = req.body;

    await pool.query(
      `UPDATE patients
      SET fullname = ?,
          phone = ?,
          address = ?,
          diagnosis = ?,
          palliative_status = ?
      WHERE id = ?`,
      [fullname, phone, address, diagnosis, palliative_status, req.params.id]
    );

    res.json({ message: 'Patient updated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM patients WHERE id = ?', [req.params.id]);

    res.json({ message: 'Patient deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
