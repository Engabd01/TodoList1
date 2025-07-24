// --- 1. Import Required Packages ---
import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

// --- 2. Setup Express App & Database Connection ---
const app = express();
const port = 3000;

const db = new pg.Client({
    user: "postgres1",
    host: "postgresql://postgres1:wkcC3T5fmegOVlscWzSNbCXxLykXJ8Gt@dpg-d20pqpbipnbc73dhvv50-a/world_8tpt",
    database: "world_8tpt", // Make sure this is the name of your database
    password: "wkcC3T5fmegOVlscWzSNbCXxLykXJ8Gt", // Your actual password
    port: 5432,
});
db.connect();

// --- 3. Middleware ---
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


// --- 4. Routes ---

// GET Route: Fetch all tasks and render the main page
app.get("/", async (req, res) => {
    try {
        // The query now selects all the new columns as well.
        const result = await db.query("SELECT * FROM tasks ORDER BY id ASC");
        const tasks = result.rows;
        res.render("index.ejs", { tasks: tasks });
    } catch (err) {
        console.error("Error fetching tasks:", err);
        res.status(500).send("Error fetching tasks");
    }
});

// POST Route: Add a new task with all the new details
app.post("/tasks", async (req, res) => {
    // Destructure all the new fields from the request body
    const { task, category, time_required_mins, note } = req.body;
    
    // Convert empty string for time to null for the database
    const time = time_required_mins ? parseInt(time_required_mins) : null;

    try {
        const result = await db.query(
            "INSERT INTO tasks (task, category, time_required_mins, note) VALUES ($1, $2, $3, $4) RETURNING *",
            [task, category, time, note]
        );
        // Send back the newly created task object as JSON
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Error adding task:", err);
        res.status(500).json({ error: "Error adding task" });
    }
});

// PUT Route: Update a task's status (done/not done)
// This route remains largely the same.
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
// This route remains the same.
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
