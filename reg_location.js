document.addEventListener("DOMContentLoaded", async () => {
    const dateInput = document.getElementById("date");
    const scheduleTable = document.getElementById("scheduleTable");
    const tbody = scheduleTable.querySelector("tbody");

    const fetchJSON = async (file) => {
        const response = await fetch(`./${file}`);
        return await response.json();
    };

    const files = {
        registrars: "registrars_data.json",
        rota: "rota.json",
        regBlocks: "reg_blocks.json",
    };

    const [registrars, rota, regBlocks] = await Promise.all([
        fetchJSON(files.registrars),
        fetchJSON(files.rota),
        fetchJSON(files.regBlocks),
    ]);

    const parseDate = (dateString) => new Date(dateString);

    const isLeave = (registrar, selectedDate) => {
        const leaveRecords = registrar.leave_records || [];
        return leaveRecords.some((record) => {
            const start = parseDate(record.start);
            const end = parseDate(record.end);
            return selectedDate >= start && selectedDate <= end;
        });
    };

    const getAAUShift = (date, session) => {
        const formattedDate = date.toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });
        const shiftType = `${date.toLocaleDateString("en-US", { weekday: "long" })} ${session}`;
        return rota.find((shift) => shift["Date"] === formattedDate && shift["Shift Type"] === shiftType)?.Registrar || null;
    };

    const getBlock = (registrar, date) => {
        const blocksData = regBlocks[registrar]?.Blocks || [];
        for (let block of blocksData) {
            const startDate = new Date(block.start_year, new Date(`${block.start_month} 1`).getMonth(), 1);
            const endDate = new Date(block.end_year, new Date(`${block.end_month} 1`).getMonth() + 1, 0);
            if (date >= startDate && date <= endDate) {
                return block.block_name;
            }
        }
        return null;
    };

    dateInput.addEventListener("change", () => {
        const selectedDate = parseDate(dateInput.value);
        tbody.innerHTML = "";

        if (!selectedDate) return;

        registrars.forEach((registrar) => {
            const registrarName = registrar.name;
            let amActivity = "";
            let pmActivity = "";

            if (isLeave(registrar, selectedDate)) {
                amActivity = "Leave";
                pmActivity = "Leave";
            } else {
                const aauAM = getAAUShift(selectedDate, "AM");
                const aauPM = getAAUShift(selectedDate, "PM");

                if (aauAM === registrarName) amActivity = "AAU";
                if (aauPM === registrarName) pmActivity = "AAU";

                if (!amActivity) {
                    const blockName = getBlock(registrarName, selectedDate);
                    amActivity = blockName || "";
                }
                if (!pmActivity) {
                    const blockName = getBlock(registrarName, selectedDate);
                    pmActivity = blockName || "";
                }
            }

            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${registrarName}</td>
                <td>${amActivity}</td>
                <td>${pmActivity}</td>
            `;
            tbody.appendChild(row);
        });

        scheduleTable.style.display = "table";
    });
});
