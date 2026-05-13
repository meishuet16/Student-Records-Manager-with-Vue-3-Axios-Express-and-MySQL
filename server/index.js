// server/index.js


const express = require('express')
const cors = require('cors')
const pool = require('./db')

const app = express()

app.use(cors())
app.use(express.json())

// --- Health check ---
app.get('/', (req, res) => res.json({ status: 'ok' }))

// --- READ list---
app.get('/students', async (req, res) => {
  try {
    const { q, sortBy, order, page, size } = req.query

    // page 
    // size
    const pageNum = Math.max(1, parseInt(page) || 1)
    const pageSize = Math.max(1, Math.min(100, parseInt(size) || 10)) // 最多 100 筆
    const offset = (pageNum - 1) * pageSize // 跳過前幾筆

    let whereClause = ''
    const whereParams = []

    if (q) {
      whereClause = ` WHERE name LIKE ?
                      OR matricNo LIKE ?
                      OR email LIKE ?
                      OR course LIKE ?`
      const like = `%${q}%`
      whereParams.push(like, like, like, like)
    }

    const [countResult] = await pool.query(
      `SELECT COUNT(*) AS total FROM students${whereClause}`,
      whereParams
    )
    const total = countResult[0].total

    let sql = `SELECT * FROM students${whereClause}`

    const allowedSort = ['name', 'matricNo', 'gpa', 'year']
    if (sortBy && allowedSort.includes(sortBy)) {
      const direction = order === 'desc' ? 'DESC' : 'ASC'
      sql += ` ORDER BY ${sortBy} ${direction}`
    } else {
      sql += ` ORDER BY id ASC` 
    }

    sql += ` LIMIT ? OFFSET ?`
    const params = [...whereParams, pageSize, offset]

    const [rows] = await pool.query(sql, params)

    res.json({
      data: rows,
      total,                                          // 總筆數
      page: pageNum,                                  // 當前第幾頁
      size: pageSize,                                 // 每頁幾筆
      totalPages: Math.ceil(total / pageSize)         // 總頁數
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Database error' })
  }
})

// --- READ single ---
app.get('/students/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM students WHERE id = ?', [req.params.id])
    if (!rows.length) return res.status(404).json({ error: 'Not found' })
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: 'Database error' })
  }
})

// --- CREATE ---
app.post('/students', async (req, res) => {
  try {
    const { matricNo, name, course, faculty, gpa, email, year, active } = req.body

    // Server-side validation (Extension C)
    const validationErrors = validateStudent(req.body)
    if (Object.keys(validationErrors).length > 0) {
      return res.status(400).json({ errors: validationErrors })
    }

    const [r] = await pool.query(
      `INSERT INTO students
       (matricNo, name, course, faculty, gpa, email, year, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [matricNo, name, course, faculty, gpa, email, year, active ? 1 : 0]
    )
    res.status(201).json({ id: r.insertId, ...req.body })
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Matric number already exists' })
    }
    console.error(err)
    res.status(500).json({ error: 'Database error' })
  }
})

// --- UPDATE ---
app.put('/students/:id', async (req, res) => {
  try {
    // Server-side validation (Extension C)
    const validationErrors = validateStudent(req.body)
    if (Object.keys(validationErrors).length > 0) {
      return res.status(400).json({ errors: validationErrors })
    }

    const { matricNo, name, course, faculty, gpa, email, year, active } = req.body
    const [r] = await pool.query(
      `UPDATE students SET
       matricNo=?, name=?, course=?, faculty=?,
       gpa=?, email=?, year=?, active=?
       WHERE id=?`,
      [matricNo, name, course, faculty, gpa, email, year,
       active ? 1 : 0, req.params.id]
    )
    if (!r.affectedRows) return res.status(404).json({ error: 'Not found' })
    res.json({ id: Number(req.params.id), ...req.body })
  } catch (err) {
    res.status(500).json({ error: 'Database error' })
  }
})

// --- PATCH (Extension B) ---
app.patch('/students/:id', async (req, res) => {
  try {
    const allowed = ['matricNo', 'name', 'course', 'faculty', 'gpa', 'email', 'year', 'active']
    const entries = Object.entries(req.body).filter(([k]) => allowed.includes(k))

    if (!entries.length) {
      return res.status(400).json({ error: 'No valid fields to update' })
    }

    const setClause = entries.map(([k]) => `${k}=?`).join(', ')
    const params = entries.map(([_, v]) => v).concat(req.params.id)

    const [r] = await pool.query(
      `UPDATE students SET ${setClause} WHERE id=?`,
      params
    )
    if (!r.affectedRows) return res.status(404).json({ error: 'Not found' })

    const [rows] = await pool.query('SELECT * FROM students WHERE id=?', [req.params.id])
    res.json(rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Database error' })
  }
})

// --- DELETE ---
app.delete('/students/:id', async (req, res) => {
  try {
    const [r] = await pool.query(
      'DELETE FROM students WHERE id = ?', [req.params.id])
    if (!r.affectedRows) return res.status(404).json({ error: 'Not found' })
    res.json({ deleted: true })
  } catch (err) {
    res.status(500).json({ error: 'Database error' })
  }
})

// --- Faculty Statistics (Extension D) ---
app.get('/students/stats', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        faculty,
        COUNT(*) AS total,
        ROUND(AVG(gpa), 2) AS avgGpa,
        MIN(year) AS minYear,
        MAX(year) AS maxYear
      FROM students
      GROUP BY faculty
      ORDER BY total DESC
    `)
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Database error' })
  }
})

// --- Extension C: Server-side validation helper ---
const matricRegex = /^[A-Z][0-9]{2}[A-Z]{2}[0-9]{4}$/
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateStudent(body) {
  const errors = {}
  const { matricNo, name, course, faculty, gpa, email, year } = body

  if (!matricNo || !matricRegex.test(String(matricNo).trim().toUpperCase())) {
    errors.matricNo = 'Format: A21CS0001 (1 letter, 2 digits, 2 letters, 4 digits).'
  }

  if (!name || String(name).trim().length < 3) {
    errors.name = 'Name must be at least 3 characters.'
  }

  if (!email || !emailRegex.test(String(email).trim())) {
    errors.email = 'Please enter a valid email address.'
  }

  const gpaNum = Number(gpa)
  if (isNaN(gpaNum) || gpaNum < 0 || gpaNum > 4) {
    errors.gpa = 'GPA must be between 0.00 and 4.00.'
  }

  if (!course || !String(course).trim()) {
    errors.course = 'Course is required.'
  }

  if (!faculty || !String(faculty).trim()) {
    errors.faculty = 'Faculty is required.'
  }

  const yearNum = Number(year)
  if (isNaN(yearNum) || yearNum < 1 || yearNum > 6) {
    errors.year = 'Year must be between 1 and 6.'
  }

  return errors
}

const PORT = process.env.PORT || 3000
app.listen(PORT, () =>
  console.log(`API running at http://localhost:${PORT}`)
)