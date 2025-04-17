const express = require('express')
const pg = require('pg')
const morgan = require('morgan')
require('dotenv').config();
const server = express()
const port = 3002

const client = new pg.Client(
    process.env.DATABASE_URL || 'postgres://localhost:5432/acme_hr_directory'
);

const init = async () => {
    await client.connect()
    console.log('connected to database')

    let SQL = `
  DROP TABLE IF EXISTS employees;
  DROP TABLE IF EXISTS departments;
  
  CREATE TABLE departments(
    id SERIAL PRIMARY KEY,
    name VARCHAR(49) NOT NULL
  );
  
  CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(30) NOT NULL,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    department_id INTEGER REFERENCES departments(id) NOT NULL
  );
`;
    await client.query(SQL);
    console.log("tables created");

    SQL = 
    `INSERT INTO departments(name) VALUES ('child labor');
    INSERT INTO departments(name) VALUES ('management');
    INSERT INTO departments(name) VALUES ('accounting');

    INSERT INTO employees(name, department_id) VALUES ('Luke Skywalker', 1);
    INSERT INTO employees(name, department_id) VALUES ('Han Solo', 2);
    INSERT INTO employees(name, department_id) VALUES ('Chewbacca', 3);
    `;
    await client.query(SQL);
    console.log("data seeded");

    server.use(express.json());
    server.use(morgan("dev"));

    //routes
    server.get("/api/departments", async (req, res, next) => {
        try {
            const SQL = `SELECT * from departments;`;
            const response = await client.query(SQL);
            res.send(response.rows);
        } catch (error) {
            next(error);
        }
    });

    server.get("/api/employees", async (req, res, next) => {
        try {
            const SQL = `SELECT * from employees ORDER BY created_at DESC;`;
            const response = await client.query(SQL);
            res.send(response.rows);
        } catch (error) {
            next(error);
        }
    });

    server.post("/api/employees", async (req, res, next) => {
        try {
            const { name, department_id } = req.body;
            const SQL = `INSERT INTO employees(name, department_id) VALUES($1, $2) RETURNING *;`;
            const response = await client.query(SQL, [name, department_id]);
            res.send(response.rows[0]);
        } catch (error) {
            next(error);
        }
    });

    server.put("/api/employees/:id", async (req, res, next) => {
        try {
            const { name, department_id } = req.body;
            const SQL = `UPDATE employees SET name=$1, department_id=$2, updated_at=now() WHERE id=$3 RETURNING *;`;
            const response = await client.query(SQL, [
                name,
                department_id,
                req.params.id
            ]);
            res.send(response.rows[0]);
        } catch (error) {
            next(error);
        }
    });

    server.delete("/api/employees/:id", async (req, res, next) => {
        try {
            const SQL = `DELETE FROM employees WHERE id=$1`;
            await client.query(SQL, [req.params.id]);
            res.sendStatus(204);
        } catch (error) {
            next(error);
        }
    });

    //error handling route
    server.use((err, req, res, next) => {
        console.error(err);
        res.status(500).send({ error: err.message });
    });
}

init();
server.listen(port, () => console.log(`listening on port ${port}`));