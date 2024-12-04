// DOM Elements
const rotaTableBody = document.querySelector("#rota-table tbody");
const weekTitle = document.getElementById("week-title");
const prevWeekButton = document.getElementById("prev-week");
const nextWeekButton = document.getElementById("next-week");
const loginForm = document.getElementById("login-form");
const loginContainer = document.getElementById("login-container");
const rotaContainer = document.getElementById("rota-container");
const loginError = document.getElementById("login-error");

let currentDate = new Date(); // Default current date
let rotaData = [];
let firstDate = null; // Earliest date in JSON
let lastDate = null; // Latest date in JSON

// Global token for authenticated requests
let authToken = "";

// Toggle visibility of login or rota view
function toggleLoginView(isLoggedIn) {
    if (isLoggedIn) {
        loginContainer.style.display = "none";
        rotaContainer.style.display = "block";
        loadRotaData();
    } else {
        loginContainer.style.display = "block";
        rotaContainer.style.display = "none";
    }
}

// Set token with expiry
function setToken(token) {
    const data = {
        value: token,
        expiry: Date.now() + 10 * 60 * 1000, // 10 minutes
    };
    localStorage.setItem("loginToken", JSON.stringify(data));
}

// Check token validity
function checkLogin() {
    const tokenString = localStorage.getItem("loginToken");
    if (!tokenString) return false;

    const token = JSON.parse(tokenString);
    if (Date.now() > token.expiry) {
        localStorage.removeItem("loginToken");
        return false;
    }

    authToken = token.value; // Store the valid token globally
    return true;
}

// Format date to "Day, dd Month yyyy"
function formatDate(date) {
    return date.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
    });
}

// Parse a date string in "dd Month yyyy" format
function parseDateString(dateString) {
    const [day, month, year] = dateString.split(" ");
    return new Date(`${month} ${day}, ${year}`);
}

// Get the Monday of the current week
function getWeekStart(date) {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    return new Date(date.setDate(diff));
}

// Update navigation button states
function updateButtonStates() {
    const weekStart = getWeekStart(new Date(currentDate));
    prevWeekButton.disabled = weekStart <= firstDate;
    const nextWeekStart = new Date(weekStart);
    nextWeekStart.setDate(nextWeekStart.getDate() + 14);
    nextWeekButton.disabled = nextWeekStart > lastDate;
}

// Display the rota for the current week
function displayRota() {
    const weekStart = getWeekStart(new Date(currentDate));
    weekTitle.textContent = `Week of: ${formatDate(weekStart)}`;
    rotaTableBody.innerHTML = "";

    for (let i = 0; i < 7; i++) {
        const currentDay = new Date(weekStart);
        currentDay.setDate(weekStart.getDate() + i);
        const dayName = currentDay.toLocaleDateString("en-GB", { weekday: "long" });
        const dayDate = currentDay.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

        const amShift = rotaData.find(
            (item) => parseDateString(item.Date).toDateString() === currentDay.toDateString() && item["Shift Type"].includes("AM")
        );
        const pmShift = rotaData.find(
            (item) => parseDateString(item.Date).toDateString() === currentDay.toDateString() && item["Shift Type"].includes("PM")
        );

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${dayName} (${dayDate})</td>
            <td>${amShift ? amShift.Registrar : "N/A"}</td>
            <td>${pmShift ? pmShift.Registrar : "N/A"}</td>
        `;
        rotaTableBody.appendChild(row);
    }
    updateButtonStates();
}

// Redirect to blocks.html
function openBlocksPage() {
    window.location.href = "blocks.html";
}

// Redirect to leave.html
function openLeave() {
    window.location.href = "leave.html";
}

// Load rota data from the local file
async function loadRotaData() {
    try {
        // Use a relative path to fetch rota.json from the same directory
        const response = await fetch("./rota.json");

        // Check for a successful response
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        // Parse the JSON data
        const rotaData = await response.json();
        
        // Process the data (e.g., calculate date ranges)
        const firstDate = getWeekStart(parseDateString(rotaData[0].Date));
        const lastDate = getWeekStart(parseDateString(rotaData[rotaData.length - 1].Date));
        lastDate.setDate(lastDate.getDate() + 14);
        
        // Display the rota
        displayRota(rotaData, firstDate, lastDate);
    } catch (error) {
        console.error("Error loading rota.json:", error);
    }
}


// Initialise the page
document.addEventListener("DOMContentLoaded", () => {
    toggleLoginView(checkLogin());

if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        // User input
        const usernameInput = document.getElementById("username").value.trim().toLowerCase();
        const passwordInput = document.getElementById("password").value;

        // Hardcoded hashes for username and password
        const usernameHash = "ba7c7a43cf6f5cf00ec4ba93b64a94d1"; 
        const passwordHash = "fc5e038d38a57032085441e7fe7010b0"; 

        // Function to hash input values
        function hashValue(value) {
            return crypto.subtle.digest("MD5", new TextEncoder().encode(value))
                .then((hashBuffer) => {
                    return Array.from(new Uint8Array(hashBuffer))
                        .map(b => b.toString(16).padStart(2, "0"))
                        .join("");
                });
        }

        try {
            // Hash the username and password inputs
            const [hashedUsername, hashedPassword] = await Promise.all([
                hashValue(usernameInput),
                hashValue(passwordInput)
            ]);

            // Validate hashed inputs against hardcoded hashes
            if (hashedUsername === usernameHash && hashedPassword === passwordHash) {
                const token = "dummy-token"; // Generate a dummy token (could be a random string in a real app)
                setToken(token); // Save the token
                authToken = token; // Set the global authToken
                toggleLoginView(true); // Load rota after token is set
            } else {
                loginError.textContent = "Invalid username or password";
            }
        } catch (error) {
            console.error("Login error:", error);
            loginError.textContent = "Error during login. Please try again.";
        }
    });
}



    prevWeekButton.addEventListener("click", () => {
        currentDate.setDate(currentDate.getDate() - 7);
        displayRota();
    });

    nextWeekButton.addEventListener("click", () => {
        currentDate.setDate(currentDate.getDate() + 7);
        displayRota();
    });
});
