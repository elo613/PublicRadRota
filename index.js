// DOM Elements
const rotaTableBody = document.querySelector("#rota-table tbody");
const weekTitle = document.getElementById("week-title");
const prevWeekButton = document.getElementById("prev-week");
const nextWeekButton = document.getElementById("next-week");
const loginForm = document.getElementById("login-form");
const loginContainer = document.getElementById("login-container");
const rotaContainer = document.getElementById("rota-container");
const loginError = document.getElementById("login-error");
const leaveTodayInput = document.getElementById("on-leave-today");

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

// [Previous code remains the same until displayRota function]

async function displayRota() {
    const weekStart = getWeekStart(new Date(currentDate));
    weekTitle.textContent = `Week of: ${formatDate(weekStart)}`;
    rotaTableBody.innerHTML = ""; // Clear existing rows

    // Load ultrasound data
    let ultrasoundData = [];
    try {
        const response = await fetch("./ultrasound.json");
        if (response.ok) {
            ultrasoundData = await response.json();
        }
    } catch (error) {
        console.error("Error loading ultrasound data:", error);
    }

    // Loop through each day of the week (7 days)
    for (let i = 0; i < 7; i++) {
        const currentDay = new Date(weekStart);
        currentDay.setDate(weekStart.getDate() + i);
        const dayName = currentDay.toLocaleDateString("en-GB", { weekday: "long" });
        const dayDate = currentDay.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
        const dateKey = formatDateForComparison(currentDay); // Format as "dd/mm/yyyy"

        // Find the rota data for the current day
        const rotaDayData = rotaData.find(item => {
            const itemDate = parseDateString(item.Date);
            return itemDate.toDateString() === currentDay.toDateString();
        });

        // Find ultrasound data for the current day
        const dayUltrasound = ultrasoundData.filter(item => {
            return item.Date === dateKey;
        });

        // Get AM and PM shift details from rota.json
        const amDuty = rotaDayData?.Shifts?.AM?.Duty || "-";
        const amReporting = rotaDayData?.Shifts?.AM?.Reporting || "-";
        const pmDuty = rotaDayData?.Shifts?.PM?.Duty || "-";
        const pmReporting = rotaDayData?.Shifts?.PM?.Reporting || "-";

        let ultrasoundText = "-";
        if (dayUltrasound.length > 0) {
            // Create separate lines for AM and PM
            const amEntry = dayUltrasound.find(us => us.Session === "AM");
            const pmEntry = dayUltrasound.find(us => us.Session === "PM");
            
            ultrasoundText = [
                amEntry ? `AM: ${amEntry["Registrar name"]}` : "AM: -",
                pmEntry ? `PM: ${pmEntry["Registrar name"]}` : "PM: -"
            ].join('\n'); // Using newline character
        }

        // Get registrars on leave for the current day
        const registrarsOnLeave = await get_who_on_leave(currentDay);

        const row = document.createElement("tr");

        // Reset any existing highlighting
        row.style.backgroundColor = "";

        // Apply highlighting for the current date
        if (currentDay.toDateString() === new Date().toDateString()) {
            row.style.backgroundColor = "lightblue";
        }

        // Get the list of registrars on leave
        const onLeave = registrarsOnLeave.length > 0 ? registrarsOnLeave.join(", ") : "None";

        // Populate row with data - now showing both rota and ultrasound info
        row.innerHTML = `
            <td>${dayName} (${dayDate})</td>
            <td>${amDuty}</td>
            <td>${amReporting}</td>
            <td>${pmDuty}</td>
            <td>${pmReporting}</td>
            <td style="white-space: pre-line">${ultrasoundText}</td>
            <td>${onLeave}</td>
        `;

        rotaTableBody.appendChild(row);
    }
    updateButtonStates();
}

// Helper function to format date as "dd/mm/yyyy" for comparison with ultrasound data
function formatDateForComparison(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// [Rest of the code remains the same]


function parseDateString(dateString) {
    const [day, month, year] = dateString.split("/"); // Split the date into day, month, year
    return new Date(`${month}/${day}/${year}`); // Construct a Date object in MM/DD/YYYY format
}




// Function to get the registrars on leave for a specific day
async function get_who_on_leave(currentDay) {
    const response = await fetch('registrars_data.json'); // Assuming the JSON file is in the same directory as the website
    const leaveData = await response.json(); // Parse the JSON data
    const registrarsOnLeave = [];

    // Iterate through the registrar data to check each registrar's leave records
    leaveData.forEach((registrar) => {
        registrar.leave_records.forEach((leave) => {
            const leaveStartDate = new Date(leave.start);
            const leaveEndDate = new Date(leave.end);
            
            // Set the leave end date to the very last moment of the last day (23:59:59.999)
            leaveEndDate.setHours(23, 59, 59, 999);

            // Check if the current day is within the leave period
            if (currentDay >= leaveStartDate && currentDay <= leaveEndDate) {
                if (!registrarsOnLeave.includes(registrar.name)) {
                    registrarsOnLeave.push(registrar.name); // Add registrar to the list if on leave
                }
            }
        });
    });

    return registrarsOnLeave;
}



// Redirect to blocks.html
function openBlocksPage() {
    window.location.href = "blocks.html";
}

function openRegLocation() {
    window.location.href = "where_at.html";
}

// Redirect to leave.html
function openLeave() {
    window.location.href = "leave.html";
}

function openShowRegLocation() {
    window.location.href = "reg_location.html";
}

function openRegBlocks() {
    window.location.href = "reg_blocks.html";
}

async function loadRotaData() {
    try {
        // Use relative path to fetch rota.json
        const response = await fetch("./rota.json");

        // Check for a successful response
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        // Parse the JSON data
        rotaData = await response.json();

        // Validate rotaData
        if (!rotaData || !rotaData.length) {
            throw new Error("rota.json is empty or not formatted correctly.");
        }

        // Process dates
        firstDate = getWeekStart(parseDateString(rotaData[0].Date));
        lastDate = getWeekStart(parseDateString(rotaData[rotaData.length - 1].Date));
        lastDate.setDate(lastDate.getDate() + 14);

        // Display the rota
        displayRota();
    } catch (error) {
        console.error("Error loading rota.json:", error);
    }
}


async function loadLeaveData() {
    try {
        // Fetch the JSON file
        const response = await fetch("./registrars_data.json");

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const registrarsData = await response.json();

        // Get today's date
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to the start of today

        // Collect registrars who are on leave today
        const onLeave = [];

        // Loop through each registrar
        registrarsData.forEach((registrar) => {
            // Loop through each leave record of the registrar
            registrar.leave_records.forEach((leave) => {
                const leaveStart = new Date(leave.start);
                leaveStart.setHours(0, 0, 0, 0); // Start of the leave day

                const leaveEnd = new Date(leave.end);
                leaveEnd.setHours(23, 59, 59, 999); // End of the leave day

                let halfDay = ""
                if (leave.half_day == true) {
                    halfDay = "(0.5)"
                }

                // Check if today falls within the leave period
                if (leaveStart <= today && leaveEnd >= today) {
                    onLeave.push(registrar.name + halfDay);
                }
            });
        });

        // Populate the "On Leave Today" textbox
        leaveTodayInput.value = onLeave.length
            ? onLeave.join(", ")
            : "No one on leave today";
    } catch (error) {
        console.error("Error loading leave data:", error);
        leaveTodayInput.value = "Error loading data";
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

        // Hardcoded SHA-256 hashes for username and password
        const usernameHash = "f56c68f42cb42511dd16882d80fb852b44126eb19210785ad23dd16ad2273032"; 
        const passwordHash = "a27fd1720a7c30a644351e9d80659326a48b6e2f421286dbee282d235a23f53c"; 

        // Function to hash input values using SHA-256
        async function hashValue(value) {
            const encoder = new TextEncoder();
            const data = encoder.encode(value);
            const hashBuffer = await crypto.subtle.digest("SHA-256", data);
            return Array.from(new Uint8Array(hashBuffer))
                .map(b => b.toString(16).padStart(2, "0"))
                .join("");
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
