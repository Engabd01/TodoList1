// index.js

// Import the necessary libraries
const express = require('express');
const { Client } = require('pg');
const path = require('path');
// Import dotenv and load environment variables from the .env file
require('dotenv').config();

// Initialize the Express application
const app = express();
const port = process.env.PORT || 3000;

// Enable express to parse URL-encoded bodies (for form data)
app.use(express.urlencoded({ extended: true }));

// Set up the PostgreSQL connection client using environment variables
// Database Connection Setup
const client = new Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false
  }
});

// Connect the client to the database once when the server starts.
// This fixes the "cannot reuse a client" error.
client.connect()
  .then(() => console.log('Successfully connected to the database.'))
  .catch(err => console.error('Connection error', err.stack));

// A function to query the data from the connected client
async function getTableData() {
  try {
    // We'll use the 'notes' table as per your last request.
    const query = 'SELECT id, title, content FROM notes ORDER BY id ASC';
    const result = await client.query(query);

    console.log(`Fetched ${result.rows.length} rows.`);
    return result.rows;

  } catch (err) {
    console.error('Error executing query', err.stack);
    return []; // Return an empty array on error to prevent the app from crashing
  }
}

// Define the root route to serve the HTML page with the table and the form
app.get('/', async (req, res) => {
  const data = await getTableData();

  // Generate the HTML for the table rows
  const tableRows = data.map(row => `
    <tr>
      <td class="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-sm font-medium text-gray-900">${row.id}</td>
      <td class="px-3 py-2 sm:px-6 sm:py-4 text-sm text-gray-500">${row.title}</td>
      <td class="px-3 py-2 sm:px-6 sm:py-4 text-sm text-gray-500">${row.content}</td>
      <td class="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-right text-sm font-medium">
        <form action="/delete-note" method="POST">
          <input type="hidden" name="id" value="${row.id}">
          <button type="submit" class="p-2 text-red-600 hover:text-red-900 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.728-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
          </button>
        </form>
      </td>
    </tr>
  `).join('');

  // Send the complete HTML response
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>PostgreSQL Data Table</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        body {
          font-family: 'Inter', sans-serif;
          background-color: #f3f4f6;
        }
      </style>
    </head>
    <body class="bg-gray-100 flex items-center justify-center min-h-screen">
      <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
        
        <!-- Form to add new notes (improved layout) -->
        <div class="bg-white shadow-lg rounded-lg overflow-hidden p-4 sm:p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-4">Add a New Note</h2>
          <form id="add-note-form" action="/add-note" method="POST" class="flex flex-col sm:flex-row items-end gap-4">
            <div class="flex-1 w-full">
              <label for="title" class="block text-sm font-medium text-gray-700">Title</label>
              <input type="text" id="title" name="title" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" required>
            </div>
            <div class="flex-1 w-full">
              <label for="content" class="block text-sm font-medium text-gray-700">Content</label>
              <textarea id="content" name="content" rows="1" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 resize-none" required></textarea>
            </div>
            <div class="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <button type="button" id="generate-ai-btn" class="w-full sm:w-auto inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                Generate with AI
              </button>
              <button type="submit" class="w-full sm:w-auto inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                Add Note
              </button>
            </div>
          </form>
        </div>

        <!-- Collapsible table to display existing notes -->
        <div class="bg-white shadow-lg rounded-lg overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h1 class="text-2xl font-bold text-gray-900">PostgreSQL Data</h1>
            <button id="toggle-table-btn" class="p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              <svg id="toggle-icon-plus" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <svg id="toggle-icon-minus" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-500 hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 12H6" />
              </svg>
            </button>
          </div>
          <div id="table-container" class="overflow-x-auto hidden">
            <table class="w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th scope="col" class="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th scope="col" class="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Content</th>
                  <th scope="col" class="relative px-3 py-2 sm:px-6 sm:py-3"><span class="sr-only">Delete</span></th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                ${tableRows}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <script>
        document.addEventListener('DOMContentLoaded', function() {
          const toggleButton = document.getElementById('toggle-table-btn');
          const tableContainer = document.getElementById('table-container');
          const plusIcon = document.getElementById('toggle-icon-plus');
          const minusIcon = document.getElementById('toggle-icon-minus');
          const generateButton = document.getElementById('generate-ai-btn');
          const titleInput = document.getElementById('title');
          const contentInput = document.getElementById('content');
          
          if (tableContainer.children.length > 0 && tableContainer.children[0].getElementsByTagName('tbody')[0].getElementsByTagName('tr').length > 0) {
            tableContainer.classList.remove('hidden');
            plusIcon.classList.add('hidden');
            minusIcon.classList.remove('hidden');
          }

          toggleButton.addEventListener('click', function() {
            if (tableContainer.classList.contains('hidden')) {
              tableContainer.classList.remove('hidden');
              plusIcon.classList.add('hidden');
              minusIcon.classList.remove('hidden');
            } else {
              tableContainer.classList.add('hidden');
              plusIcon.classList.remove('hidden');
              minusIcon.classList.add('hidden');
            }
          });
          
          // Function to generate a note using AI
          generateButton.addEventListener('click', async () => {
              // Show loading state and disable the button
              generateButton.textContent = 'Generating...';
              generateButton.disabled = true;
              
              // Clear previous inputs
              titleInput.value = '';
              contentInput.value = '';

              try {
                  const prompt = "Generate a short, creative note. The first line should be the title and the following lines should be the content.";
                  let chatHistory = [];
                  chatHistory.push({ role: "user", parts: [{ text: prompt }] });
                  const payload = { contents: chatHistory };
                  const apiKey = "";
                  const apiUrl = \`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=\${apiKey}\`;
                  
                  const response = await fetch(apiUrl, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(payload)
                  });
                  
                  if (!response.ok) {
                      throw new Error(\`API request failed with status: \${response.status}\`);
                  }
                  
                  const result = await response.json();
                  
                  if (result.candidates && result.candidates.length > 0 &&
                      result.candidates[0].content && result.candidates[0].content.parts &&
                      result.candidates[0].content.parts.length > 0) {
                    const text = result.candidates[0].content.parts[0].text;
                    const lines = text.split('\\n');
                    const title = lines[0];
                    const content = lines.slice(1).join('\\n').trim();

                    titleInput.value = title;
                    contentInput.value = content;
                  } else {
                    console.error('Unexpected API response structure:', result);
                    alert('Could not generate note. Please try again.');
                  }
                  
              } catch (error) {
                  console.error('Error generating note:', error);
                  alert('Error generating note. Check the console for details.');
              } finally {
                  // Revert button state
                  generateButton.textContent = 'Generate with AI';
                  generateButton.disabled = false;
              }
          });
        });
      </script>
    </body>
    </html>
  `);
});

// Define a new POST route to handle form submissions for adding a new note
app.post('/add-note', async (req, res) => {
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).send('Title and content are required.');
  }

  try {
    // Use a parameterized query to prevent SQL injection
    const query = 'INSERT INTO notes (title, content) VALUES ($1, $2)';
    await client.query(query, [title, content]);
    console.log('New note added successfully.');
    // Redirect back to the home page to see the updated table
    res.redirect('/');
  } catch (err) {
    console.error('Error inserting new note', err.stack);
    res.status(500).send('Error inserting new note into the database.');
  }
});

// Define a new POST route to handle deletion of a note
app.post('/delete-note', async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).send('ID is required to delete a note.');
  }

  try {
    // Use a parameterized query to safely delete the note
    const query = 'DELETE FROM notes WHERE id = $1';
    await client.query(query, [id]);
    console.log(`Note with ID ${id} deleted successfully.`);
    // Redirect back to the home page to see the updated table
    res.redirect('/');
  } catch (err) {
    console.error('Error deleting note', err.stack);
    res.status(500).send('Error deleting note from the database.');
  }
});

// Start the server and listen on the specified port
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
