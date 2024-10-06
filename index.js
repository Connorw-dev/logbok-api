require('dotenv').config(); // Load environment variables from .env file

const express = require('express');
const mysql = require('mysql2');
const moment = require('moment');

const app = express();
app.use(express.json()); // Middleware to parse JSON

// Database configuration using environment variables
const dbConfig = {
    host: process.env.DB_HOST,      // Database host (set in .env)
    user: process.env.DB_USER,      // Database user (set in .env)
    password: process.env.DB_PASSWORD, // Database password (set in .env)
    database: process.env.DB_NAME   // Database name (set in .env)
};

// POST endpoint to insert sensor data
app.post('/api/insert-sensor-record', (req, res) => {
    const connection = mysql.createConnection(dbConfig); // Establish MySQL connection

    connection.connect((err) => {
        if (err) {
            console.error('Error connecting to the database:', err);
            return res.status(500).json({ message: 'Database connection failed' });
        }

        // Check if the incoming request is an array or a single object
        const messages = Array.isArray(req.body.uplink_message) ? req.body.uplink_message : [req.body.uplink_message];

        // Map through each uplink_message to insert into the database
        const insertPromises = messages.map((message) => {
            const {
                deviceId, receivedAt, temperature, battery, sdi12_1, sdi12_2, modbus_1, modbus_2, analog_1
            } = message.decoded_payload;

            const formattedReceivedAt = moment(receivedAt).format('YYYY-MM-DD HH:mm:ss.SSS');
            const sql = 'INSERT INTO devices_data (device_id, received_at, temperature, battery, sdi12_1, sdi12_2, modbus_1, modbus_2, analog_1) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
            
            return new Promise((resolve, reject) => {
                connection.query(sql, [deviceId, formattedReceivedAt, temperature, battery, sdi12_1, sdi12_2, modbus_1, modbus_2, analog_1], (err, results) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(results);
                    }
                });
            });
        });

        // Execute all insertions
        Promise.all(insertPromises)
            .then(() => {
                res.status(200).json({ message: 'All records inserted successfully' });
            })
            .catch((err) => {
                console.error('Error inserting record:', err);
                res.status(500).json({ message: 'Failed to insert some records' });
            })
            .finally(() => {
                connection.end(); // Close the database connection
            });
    });
});

// GET endpoint to retrieve all sensor records
app.get('/api/get-sensor-records', (req, res) => {
    const connection = mysql.createConnection(dbConfig);

    connection.connect((err) => {
        if (err) {
            console.error('Error connecting to the database:', err);
            return res.status(500).json({ message: 'Database connection failed' });
        }

        const sql = 'SELECT * FROM devices_data';
        connection.query(sql, (err, results) => {
            if (err) {
                console.error('Error retrieving records:', err);
                return res.status(500).json({ message: 'Failed to retrieve records' });
            }
            res.status(200).json(results);
        });

        connection.end();
    });
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log('Server is running on port ' + PORT);
});
