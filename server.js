const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const dbPool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'student_table',
});

app.get('/api/blocks', async (req, res) => {
    try {
        const [blocks] = await dbPool.execute("SELECT BlockID, BlockName FROM block ORDER BY BlockName");
        res.json(blocks);
    } catch (error) {
        console.error("Error fetching blocks:", error);
        res.status(500).json({ error: "Failed to load block configurations." });
    }
});

app.get('/api/students', async (req, res) => {
    try {
        const queryStr = `
            SELECT s.StudentID, s.StudentNumber, s.FirstName, s.LastName, s.Email, s.IsActive, s.BlockID, s.Semester,
                   b.BlockName, b.YearLevel, b.Semester AS BlockSemester
            FROM student s
            INNER JOIN block b ON s.BlockID = b.BlockID
            ORDER BY s.StudentID ASC
        `;
        const [students] = await dbPool.execute(queryStr);

        const [totals] = await dbPool.execute(`
            SELECT Count(*) as total,
                   SUM(CASE WHEN IsActive = 1 THEN 1 ELSE 0 END) as activeCount,
                   SUM(CASE WHEN IsActive = 0 THEN 1 ELSE 0 END) as inactiveCount
            FROM student
        `);

        const metricsData = totals[0];
        res.json({
            metrics: { 
                total: metricsData.total || 0, 
                active: metricsData.activeCount || 0, 
                inactive: metricsData.inactiveCount || 0, 
                activePercentage: metricsData.total > 0 ? Math.round((metricsData.activeCount / metricsData.total) * 100) : 0 
            },
            data: students
        });
    } catch(error) {
        console.error("Database error:", error);
        res.status(500).json({ error: "Could not sync database layers." });
    }
});

app.post('/api/students', async (req, res) => {
    const { studentNum, fn, ln, mail, blockId, semester } = req.body;
    if (!studentNum || !fn || !ln || !mail || !blockId || !semester) {
        return res.status(400).json({ error: "All configuration elements must be populated." });
    }
    try {
        const [dupCheck] = await dbPool.execute("SELECT StudentID FROM student WHERE StudentNumber = ? OR Email = ?", [studentNum, mail]);
        if (dupCheck.length > 0) {
            return res.status(400).json({ error: "Student Number or Email configuration conflict." });
        }
        const insertQuery = `INSERT INTO student (StudentNumber, FirstName, LastName, Email, BlockID, Semester, IsActive) VALUES (?, ?, ?, ?, ?, ?, 1)`;
        await dbPool.execute(insertQuery, [studentNum, fn, ln, mail, blockId, semester]);
        res.json({ message: "Student account successfully added to registry array." });
    } catch (error) {
        console.error("Write error:", error);
        res.status(500).json({ error: "Database registration failure." });
    }
});

app.put('/api/students/:id', async (req, res) => {
    const studentId = req.params.id;
    const { studentNum, fn, ln, mail, blockId, semester, status } = req.body;
    
    if (!studentId || !studentNum || !fn || !ln || !mail || !blockId || !semester || status === undefined) {
        return res.status(400).json({ error: "Payload parameters missing inside database sync query operation." });
    }
    
    try {
        const bitStatus = (status === "Active" || status == 1) ? 1 : 0;
        const updateQuery = `
            UPDATE student 
            SET StudentNumber = ?, FirstName = ?, LastName = ?, Email = ?, BlockID = ?, Semester = ?, IsActive = ? 
            WHERE StudentID = ?
        `;
        await dbPool.execute(updateQuery, [studentNum, fn, ln, mail, blockId, semester, bitStatus, studentId]);
        res.json({ message: "Student record modified successfully." });
    } catch (error) {
        console.error("Update error:", error);
        res.status(500).json({ error: "Database rejected the data amendment mutation payload." });
    }
});

app.delete('/api/students/:id', async (req, res) => {
    try {
        await dbPool.execute("DELETE FROM student WHERE StudentID = ?", [req.params.id]);
        res.json({ message: "Student dropped completely from registry." });
    } catch (error) {
        console.error("Delete error:", error);
        res.status(500).json({ error: "Database blocked record elimination." });
    }
});

app.listen(PORT, () => { console.log(`[SERVER ACTIVE] Express listening on Port:${PORT}`); });
