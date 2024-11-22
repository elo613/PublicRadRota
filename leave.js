document.addEventListener("DOMContentLoaded", () => {
    const registrarSelect = document.getElementById("registrar-select");
    const leaveDetails = document.getElementById("leave-details-summary"); // Corrected
    const leaveRecords = document.getElementById("leave-records");
    const leaveSummary = document.getElementById("leave-details-summary"); // Corrected
    const annualLeaveAllowance = document.getElementById("annual-leave-allowance");
    const studyLeave = document.getElementById("study-leave");
    const leaveRecordsTable = document.querySelector("#leave-records-table tbody");
    const studyLeaveUsed = document.getElementById("study-leave-used");
    const annualLeaveUsed = document.getElementById("annual-leave-used");
    const otherLeaveUsed = document.getElementById("other-leave-used");
    const studyLeaveRemaining = document.getElementById("study-leave-remaining");
    const annualLeaveRemaining = document.getElementById("annual-leave-remaining");
    const otherLeaveRemaining = document.getElementById("other-leave-remaining");

    function hideSections() {
        leaveDetails?.classList.add("hidden");
        leaveRecords?.classList.add("hidden");
        leaveSummary?.classList.add("hidden");
    }

    hideSections()

    // Fetch the JSON data
    fetch('registrars_data.json')
        .then(response => response.json())
        .then(data => {
            // Populate the dropdown
            data.forEach(registrar => {
                const option = document.createElement("option");
                option.value = registrar.name;
                option.textContent = registrar.name;
                registrarSelect.appendChild(option);
            });

            // Event listener for registrar selection
            registrarSelect.addEventListener("change", () => {
                const selectedRegistrar = data.find(registrar => registrar.name === registrarSelect.value);
                if (selectedRegistrar) {
                    showSections();
                    displayRegistrarDetails(selectedRegistrar);
                } else {
                    hideSections();
                }
            });
        })
        .catch(error => console.error("Error loading data:", error));

    function displayRegistrarDetails(registrar) {
        // Combine leave allowances into Annual Leave
        const totalAnnualLeave = registrar.statutory_leave + registrar.carried_over_leave + registrar.days_off_in_lieu;

        // Update Leave Allowance
        annualLeaveAllowance.textContent = totalAnnualLeave || 0;
        studyLeave.textContent = registrar.study_leave || 0;

        // Update Leave Records
        leaveRecordsTable.innerHTML = "";
        let studyDays = 0, annualDays = 0, otherDays = 0;

        registrar.leave_records.forEach(record => {
            const row = document.createElement("tr");

            const startCell = document.createElement("td");
            startCell.textContent = record.start;
            row.appendChild(startCell);

            const endCell = document.createElement("td");
            endCell.textContent = record.end;
            row.appendChild(endCell);

            const typeCell = document.createElement("td");
            typeCell.textContent = record.type;
            row.appendChild(typeCell);

            const leaveDays = calculateWeekdaysBetween(record.start, record.end);
            if (record.type === "Study") studyDays += leaveDays;
            else if (record.type === "Annual") annualDays += leaveDays;
            else otherDays += leaveDays;

            leaveRecordsTable.appendChild(row);
        });

        // Update Summary with Remaining Leave
        const studyRemaining = registrar.study_leave - studyDays;
        const annualRemaining = totalAnnualLeave - annualDays;
        const otherRemaining = "NA";

        studyLeaveUsed.textContent = studyDays || 0;
        studyLeaveRemaining.textContent = studyRemaining || 0;

        annualLeaveUsed.textContent = annualDays || 0;
        annualLeaveRemaining.textContent = annualRemaining || 0;

        otherLeaveUsed.textContent = otherDays || 0;
        otherLeaveRemaining.textContent = otherRemaining || 0;
    }

    function calculateWeekdaysBetween(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        let count = 0;

        for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
            const day = date.getDay();
            if (day !== 0 && day !== 6) { // Exclude weekends
                count++;
            }
        }

        return count;
    }


    function showSections() {
        leaveDetails.classList.remove("hidden");
        leaveRecords.classList.remove("hidden");
        leaveSummary.classList.remove("hidden");
    }
});
