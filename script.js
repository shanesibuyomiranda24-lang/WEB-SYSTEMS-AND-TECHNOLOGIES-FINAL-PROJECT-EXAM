const API_URL = 'http://localhost:5000/api/students';
let allStudents = []; // Master array holding our raw database rows for client-side filtering

// Dropdown Setup: Fetch available blocks to populate the form and filter dropdowns
async function loadBlockDropdowns() {
    try {
        const response = await fetch('http://localhost:5000/api/blocks');
        const blocks = await response.json();
        
        const formBlockSelect = document.getElementById('blockId');
        const filterBlockSelect = document.getElementById('filterBlock');
        
        // Reset options
        if (formBlockSelect) formBlockSelect.innerHTML = '';
        if (filterBlockSelect) filterBlockSelect.innerHTML = '<option value="All">All blocks</option>';
        
        blocks.forEach(block => {
            const opt = `<option value="${block.BlockID}">${block.BlockName}</option>`;
            if (formBlockSelect) formBlockSelect.innerHTML += opt;
            if (filterBlockSelect) {
                // Populates filter using Block Name string values
                filterBlockSelect.innerHTML += `<option value="${block.BlockName}">${block.BlockName}</option>`;
            }
        });
    } catch (error) {
        console.error("Could not populate blocks dropdown dynamically:", error);
    }
}

// READ (R): Fetch data rows from your backend API
async function loadDashboardData() {
    try {
        const response = await fetch(API_URL);
        const result = await response.json();

        if (response.ok) {
            // Update Dashboard Metrics
            document.getElementById('statTotal').innerText = result.metrics.total;
            document.getElementById('statActive').innerText = result.metrics.active;
            document.getElementById('statInactive').innerText = result.metrics.inactive;
            document.getElementById('statActivePct').innerText = `${result.metrics.activePercentage}% of total enrolled`;

            // Cache the dataset globally so our real-time search engine can use it
            allStudents = result.data; 
            
            // Build the initial, un-filtered table
            renderTable(allStudents);
        } 
    } catch (error) {
        console.error("Frontend could not reach the API:", error);
    }
}

// RENDER ENGINE: Loops through elements and maps them 1:1 to your 10 HTML column headers
function renderTable(studentArray) {
    const tbody = document.getElementById('studentTableBody');
    tbody.innerHTML = '';

    studentArray.forEach(student => {
        const statusBadge = student.IsActive == 1 
            ? '<span style="color: green; font-weight: bold;">Active</span>' 
            : '<span style="color: red; font-weight: bold;">Inactive</span>';

        let semesterText = student.Semester;
        if (student.Semester == '1st' || student.Semester == '1') semesterText = '1st';
        if (student.Semester == '2nd' || student.Semester == '2') semesterText = '2nd';

        // CLEAN 10-CELL ROW TEMPLATE (Course completely omitted)
        const row = `
        <tr style="border-bottom: 1px solid #f0f0f0;">
            <td style="padding: 10px;">${student.StudentID}</td>
            <td style="padding: 10px; font-family: monospace;">${student.StudentNumber}</td>
            <td style="padding: 10px;">${student.FirstName}</td>
            <td style="padding: 10px;">${student.LastName}</td>
            <td style="padding: 10px;">${student.Email}</td>
            <td style="padding: 10px; font-weight: bold; color: #4a5568;">${student.BlockName || 'N/A'}</td>
            <td style="padding: 10px;">${student.YearLevel}</td>
            <td style="padding: 10px;">${semesterText}</td>
            <td style="padding: 10px;">${statusBadge}</td>
            <td style="padding: 10px;">
                <button onclick="toggleStatus(${student.StudentID})" style="background: #ffc107; border: none; padding: 5px 8px; border-radius: 4px; cursor: pointer; margin-right: 5px; font-size: 12px; font-weight: bold;">Toggle Status</button>
                <button onclick="deleteStudent(${student.StudentID})" style="background: #dc3545; color: white; border: none; padding: 5px 8px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;">Delete</button>
            </td>
        </tr>
        `;
        tbody.innerHTML += row;
    });
}

// SEARCH & FILTER ENGINE: Evaluates real-time matches across the remaining layout elements
function filterStudentTable() {
    const searchTerm = document.getElementById('searchBox').value.toLowerCase();
    const selectedBlock = document.getElementById('filterBlock').value;
    const selectedYear = document.getElementById('filterYear').value;

    const filteredResult = allStudents.filter(student => {
        // Evaluate Search Input match constraints (ID, Student Num, First Name, Last Name)
        const matchesSearch = 
            student.FirstName.toLowerCase().includes(searchTerm) ||
            student.LastName.toLowerCase().includes(searchTerm) ||
            student.StudentNumber.toLowerCase().includes(searchTerm) ||
            student.StudentID.toString().includes(searchTerm);

        // Evaluate Dropdown match constraints
        const matchesBlock = (selectedBlock === 'All' || student.BlockName === selectedBlock);
        
        // Normalizes year level match evaluations (handles '1' vs '1st Year')
        const studentYearString = student.YearLevel.toString().toLowerCase();
        const selectedYearString = selectedYear.toLowerCase();
        const matchesYear = (selectedYear === 'All' || selectedYear === '' || studentYearString.includes(selectedYearString.split(' ')[0]));

        return matchesSearch && matchesBlock && matchesYear;
    });

    renderTable(filteredResult);
}

// CREATE (C): Handle data submissions from the form (Course completely omitted)
document.getElementById('studentForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
        studentNum: document.getElementById('studentNum').value,
        fn: document.getElementById('fn').value,
        ln: document.getElementById('ln').value,
        mail: document.getElementById('mail').value,
        blockId: document.getElementById('blockId').value, 
        yearLevel: document.getElementById('yearLevel').value,
        semester: document.getElementById('semester').value,
        status: document.getElementById('status').value
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const result = await response.json();
        if (response.ok) {
            alert(result.message);
            document.getElementById('studentForm').reset();
            loadDashboardData(); 
        } else {
            alert("Error: " + result.error);
        }
    } catch (error) {
        alert("Frontend couldn't communicate with the backend server.");
    }
});

// UPDATE (U): Toggle active state flags
async function toggleStatus(id) {
    try {
        const response = await fetch(`${API_URL}/${id}/toggle`, { method: 'PUT' });
        const result = await response.json();
        if (response.ok) {
            loadDashboardData(); 
        } else {
            alert(result.error);
        }
    } catch (error) {
        alert("Error changing student status.");
    }
}

// DELETE (D): Drop database records permanently
async function deleteStudent(id) {
    if (confirm("Are you sure you want to permanently delete this student record?")) {
        try {
            const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
            const result = await response.json();
            if (response.ok) {
                alert(result.message);
                loadDashboardData(); 
            } else {
                alert(result.error);
            }
        } catch (error) {
            alert("Error deleting student from data schema.");
        }
    }
}

// Initialize Application Modules and Listeners on DomContentLoaded
window.addEventListener('DOMContentLoaded', async () => {
    await loadBlockDropdowns();
    await loadDashboardData();

    // Listeners for your updated Filter interface elements
    document.getElementById('searchBox').addEventListener('input', filterStudentTable);
    document.getElementById('filterBlock').addEventListener('change', filterStudentTable);
    document.getElementById('filterYear').addEventListener('change', filterStudentTable);
});