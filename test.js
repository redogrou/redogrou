// Require necessary modules
const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const session = require('express-session');

// Create an Express app
const app = express();

// Serve static files
app.use('/public', express.static('public'));
app.use('/views', express.static('views'));
app.use('/js', express.static('js'));

// Set up body-parser middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Set up session middleware
app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));

// Set up MySQL connection
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'SBI'
});

// Connect to MySQL database
connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL database:', err);
        return;
    }
    console.log('Connected to MySQL database');
});
const isAuthenticated = (req, res, next) => {
    // Check if user is logged in
    if (req.session.username) {
        // User is authenticated, proceed to next middleware/route handler
        next();
    } else {
        // User is not logged in, redirect to login page
        res.redirect('/login');
    }
};

// Serve HTML files
app.get('', (req, res) => {
    res.sendFile(__dirname + '/login.html');
});

app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/login.html');
});

app.get('/dashboard', isAuthenticated, (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.get('/register', (req, res) => {
    res.sendFile(__dirname + '/register.html');
});

app.get('/contact', (req, res) => {
    res.sendFile(__dirname + '/Contactus.html');
});

app.get('/',  (req, res) => {
    res.sendFile(__dirname + '/Createemp1.html');
});

app.get('/createEmployee', isAuthenticated, (req, res) => {
    res.sendFile(__dirname + '/Createemp1.html');
});


// Handle user login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    connection.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, result) => {
        if (err) {
            res.status(500).json({ error: 'Internal Server Error' });
        } else if (result.length === 0) {
            res.status(401).json({ message: 'Invalid username or password' });
        } else {
            req.session.username = username;
            res.redirect('/dashboard');
        }
    });
});

// Fetch user's username from session
app.get('/api/get-username', (req, res) => {
    const username = req.session.username;
    res.json({ username: username });
});

// Handle user registration
app.post('/register', (req, res) => {
    const { username, email, password, confirm_password } = req.body;
    if (password !== confirm_password) {
        return res.status(400).json({ error: 'Passwords do not match' });
    }
    connection.query('INSERT INTO users (username, email, password, confirm_password) VALUES (?, ?, ?, ?)', [username, email, password, confirm_password], (err, result) => {
        if (err) {
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            res.redirect('/dashboard');
        }
    });
});







// Fetch employee data
app.get('/fetchData', isAuthenticated, (req, res) => {
    const query = 'SELECT * FROM emp';
    connection.query(query, (error, results, fields) => {
        if (error) {
            console.error('Error fetching data:', error.stack);
            return res.status(500).json({ error: 'Error fetching data from the database' });
        }
        res.json(results);
    });
});

// Handle form submission and insert data into MySQL
app.post('/Createemployee', (req, res) => {
    const { empname, branchcode, branchname, monum, emailid, subgroup, indexnum, dob, sincedate, appointdate, egsince, esgsince } = req.body;
    connection.query('INSERT INTO emp (empname, branchcode, branchname, monum, emailid, subgroup, indexnum, dob, sincedate, appointdate, egsince, esgsince) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [empname, branchcode, branchname, monum, emailid, subgroup, indexnum, dob, sincedate, appointdate, egsince, esgsince],
        (err, results) => {
            if (err) {
                console.error('Error inserting data:', err);
                res.status(500).send('Internal Server Error');
                return;
            }
            console.log('Data inserted successfully');
            // Fetch birthdays after inserting data
            fetchBirthdays((error, birthdayResults) => {
                if (error) {
                    res.status(500).send('Internal Server Error');
                } else {
                    // Fetch all employee data
                    connection.query('SELECT * FROM emp', (error, employeeResults) => {
                        if (error) {
                            console.error('Error fetching employee data:', error);
                            res.status(500).send('Internal Server Error');
                        } else {
                            // Combine employee data with birthday data
                            const data = {
                                employees: employeeResults,
                                birthdays: birthdayResults
                            };
                            // Send success response with data
                            res.status(200).json({ success: true, data: data });
                        }
                    });
                }
            });
        });
});

// Function to fetch birthdays
function fetchBirthdays(callback) {
    const today = new Date().toISOString().slice(5, 10);
    const sql = `SELECT empId, empname, DATE_FORMAT(dob, '%m-%d') AS birthday FROM emp WHERE DATE_FORMAT(dob, '%m-%d') = ?`;
    connection.query(sql, [today], (err, results) => {
        if (err) {
            console.error('Error fetching birthdays:', err);
            callback(err, null);
        } else {
            callback(null, results);
        }
    });
}

// Update employee data
app.post('/updateData', (req, res) => {
    const { empname, branchcode, branchname, monum, emailid, subgroup, indexnum, dob, sincedate, appointdate, egsince, esgsince, empId } = req.body;
    const sql = `UPDATE emp SET empname=?, branchcode=?, branchname=?, monum=?, emailid=?, subgroup=?, indexnum=?, dob=?, sincedate=?, appointdate=?, egsince=?, esgsince=? WHERE empId=?`;
    connection.query(sql, [empname, branchcode, branchname, monum, emailid, subgroup, indexnum, dob, sincedate, appointdate, egsince, esgsince, empId], (err, result) => {
        if (err) {
            console.error('Error updating data:', err);
            res.status(500).json({ error: 'Failed to update data' });
        } else {
            console.log('Data updated successfully');
            res.json({ success: true });
        }
    });
});

// Delete employee data
app.post('/deleteData', (req, res) => {
    const { empId } = req.body;
    const sql = `DELETE FROM emp WHERE empId=?`;
    connection.query(sql, [empId], (err, result) => {
        if (err) {
            console.error('Error deleting data:', err);
            res.status(500).json({ error: 'Failed to delete data' });
        } else {
            console.log('Data deleted successfully');
            res.json({ success: true });
        }
    });
});

// Fetch birthdays for today
app.get('/api/today-birthdays', (req, res) => {
    const today = new Date().toISOString().slice(5, 10);
    const sql = `SELECT empId, empname, DATE_FORMAT(dob, '%m-%d') AS birthday FROM emp WHERE DATE_FORMAT(dob, '%m-%d') = ?`;
    connection.query(sql, [today], (err, results) => {
        if (err) {
            console.error('Error fetching today\'s birthdays:', err);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }
        res.json(results);
    });
});

// Fetch birthdays for tomorrow
app.get('/api/tomorrows-birthdays', (req, res) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowFormatted = formatDate(tomorrow);
    const sql = `SELECT empId, empname, DATE_FORMAT(dob, '%m-%d') AS birthday FROM emp WHERE DATE_FORMAT(dob, '%m-%d') = ?`;
    connection.query(sql, [tomorrowFormatted], (err, results) => {
        if (err) {
            console.error('Error fetching tomorrow\'s birthdays:', err);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }
        res.json(results);
    });
});

// Fetch birthdays for the day after tomorrow
app.get('/api/day-after-tomorrows-birthdays', (req, res) => {
    const dayAfterTomorrow = new Date();
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    const dayAfterTomorrowFormatted = formatDate(dayAfterTomorrow);
    const sql = `SELECT empId, empname, DATE_FORMAT(dob, '%m-%d') AS birthday FROM emp WHERE DATE_FORMAT(dob, '%m-%d') = ?`;
    connection.query(sql, [dayAfterTomorrowFormatted], (err, results) => {
        if (err) {
            console.error('Error fetching day after tomorrow\'s birthdays:', err);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }
        res.json(results);
    });
});

// Function to format date as yyyy-mm-dd
function formatDate(date) {
    const year = date.getFullYear();
    let month = (1 + date.getMonth()).toString().padStart(2, '0');
    let day = date.getDate().toString().padStart(2, '0');
    return month + '-' + day;
}

// API endpoint to fetch employee details by ID
app.get('/api/employee/:id', (req, res) => {
    const empId = req.params.id;
    const sql = `SELECT * FROM emp WHERE empId = ?`;
    connection.query(sql, [empId], (error, results) => {
        if (error) {
            console.error('Error fetching employee details:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            if (results.length > 0) {
                const employee = results[0];
                delete employee.password;
                res.json(employee);
            } else {
                res.status(404).json({ error: 'Employee not found' });
            }
        }
    });
});

// Start the server
const PORT = process.env.PORT || 3400;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
