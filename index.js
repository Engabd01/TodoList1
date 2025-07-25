// --- 0. Load Environment Variables ---
// This line loads the variables from your .env file into process.env for local development.
import 'dotenv/config';

// --- 1. Import Required Packages ---
import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

// --- 2. Setup Express App & Database Connection ---
const app = express();
const port = 3000;

const db = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
});
db.connect();

// --- NEW: Setup Database Schema on Startup ---
// This async function will run once when the server starts.
async function setupDatabase() {
    try {
        // The "IF NOT EXISTS" clause prevents an error from occurring if the table already exists.
        await db.query(`
            CREATE TABLE IF NOT EXISTS tasks (
                id SERIAL PRIMARY KEY,
                task TEXT NOT NULL,
                category VARCHAR(50) NOT NULL,
                time_required_mins INT,
                note TEXT,
                done BOOLEAN DEFAULT FALSE
            );
        `);
        console.log("Database schema is ready.");
    } catch (err) {
        console.error("Error setting up database schema:", err);
    }
}
// Call the setup function right after connecting to the database.
setupDatabase();


// --- 3. Middleware ---
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


// --- 4. Routes ---

// GET Route: Fetch all tasks and render the main page
app.get("/", async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM tasks ORDER BY id ASC");
        const tasks = result.rows;
        res.render("index.ejs", { tasks: tasks });
    } catch (err) {
        console.error("Error fetching tasks:", err);
        // Send a more user-friendly error page if the table doesn't exist yet
        if (err.code === '42P01') { // '42P01' is the error code for "undefined_table"
            return res.status(500).send("The 'tasks' table was not found. Please ensure the database setup has completed and restart the server.");
        }
        res.status(500).send("Error fetching tasks");
    }
});

// POST Route: Add a new task with all the new details
app.post("/tasks", async (req, res) => {
    const { task, category, time_required_mins, note } = req.body;
    const time = time_required_mins ? parseInt(time_required_mins) : null;

    try {
        const result = await db.query(
            "INSERT INTO tasks (task, category, time_required_mins, note) VALUES ($1, $2, $3, $4) RETURNING *",
            [task, category, time, note]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Error adding task:", err);
        res.status(500).json({ error: "Error adding task" });
    }
});

// PUT Route: Update a task's status (done/not done)
app.put("/tasks/:id", async (req, res) => {
    const taskId = req.params.id;
    const isDone = req.body.done;
    try {
        await db.query(
            "UPDATE tasks SET done = $1 WHERE id = $2",
            [isDone, taskId]
        );
        res.sendStatus(200); // OK
    } catch (err) {
        console.error("Error updating task:", err);
        res.status(500).json({ error: "Error updating task" });
    }
});

// DELETE Route: Delete a task
app.delete("/tasks/:id", async (req, res) => {
    const taskId = req.params.id;
    try {
        await db.query("DELETE FROM tasks WHERE id = $1", [taskId]);
        res.sendStatus(200); // OK
    } catch (err) {
        console.error("Error deleting task:", err);
        res.status(500).json({ error: "Error deleting task" });
    }
});


// --- 5. Start Server ---
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
