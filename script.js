const API_URL = 'http://localhost:5000/api/students';
let allStudents = [];

// Validation helpers
function isValidStudentNumber(val) {
    return /^\d{4}-\d{5}$/.test(val.trim());
}
function isValidName(val) {
    return /^[A-Za-zÀ-ÖØ-öø-ÿ\s\-'\.]+$/.test(val.trim()) && val.trim().length >= 2;
}
function isValidEmail(val) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
}

function showError(inputId, message) {
    const input = document.getElementById(inputId);
    input.style.borderColor = '#dc3545';
    input.style.boxShadow = '0 0 0 3px rgba(220,53,69,0.15)';
    let err = document.getElementById(inputId + '_err');
    if (!err) {
        err = document.createElement('span');
        err.id = inputId + '_err';
        err.style.cssText = 'color:#dc3545; font-size:11px; font-weight:600; display:block; margin-top:-8px; margin-bottom:8px;';
        input.insertAdjacentElement('afterend', err);
    }
    err.textContent = message;
}

function clearError(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.style.borderColor = '';
    input.style.boxShadow = '';
    const err = document.getElementById(inputId + '_err');
    if (err) err.remove();
}

function clearAllErrors() {
    ['studentNum', 'fn', 'ln', 'mail', 'blockId', 'semester'].forEach(clearError);
}

window.addEventListener('DOMContentLoaded', async () => {
    await loadBlockDropdowns();
    await loadDashboardData();
    injectUpdateModal();

    document.getElementById('searchBox').addEventListener('input', filterStudentTable);
    document.getElementById('filterBlock').addEventListener('change', filterStudentTable);

    ['studentNum', 'fn', 'ln', 'mail'].forEach(id => {
        document.getElementById(id).addEventListener('input', () => clearError(id));
    });

    document.getElementById('studentNum').addEventListener('blur', () => {
        const val = document.getElementById('studentNum').value;
        if (val && !isValidStudentNumber(val)) showError('studentNum', 'Format must be YYYY-NNNNN (e.g. 2024-10042)');
    });
    document.getElementById('fn').addEventListener('blur', () => {
        const val = document.getElementById('fn').value;
        if (val && !isValidName(val)) showError('fn', 'First name must contain letters only, min 2 characters.');
    });
    document.getElementById('ln').addEventListener('blur', () => {
        const val = document.getElementById('ln').value;
        if (val && !isValidName(val)) showError('ln', 'Last name must contain letters only, min 2 characters.');
    });
    document.getElementById('mail').addEventListener('blur', () => {
        const val = document.getElementById('mail').value;
        if (val && !isValidEmail(val)) showError('mail', 'Enter a valid email address.');
    });
});

async function loadBlockDropdowns() {
    try {
        const response = await fetch('http://localhost:5000/api/blocks');
        const blocks = await response.json();

        const formBlockSelect = document.getElementById('blockId');
        const filterBlockSelect = document.getElementById('filterBlock');
        const modalBlockSelect = document.getElementById('modalBlockId');

        if (formBlockSelect) formBlockSelect.innerHTML = '<option value="">-- Select --</option>';
        if (filterBlockSelect) filterBlockSelect.innerHTML = '<option value="All">All blocks</option>';
        if (modalBlockSelect) modalBlockSelect.innerHTML = '<option value="">-- Select --</option>';

        blocks.forEach(block => {
            if (formBlockSelect) formBlockSelect.innerHTML += `<option value="${block.BlockID}">${block.BlockName}</option>`;
            if (filterBlockSelect) filterBlockSelect.innerHTML += `<option value="${block.BlockName}">${block.BlockName}</option>`;
            if (modalBlockSelect) modalBlockSelect.innerHTML += `<option value="${block.BlockID}" data-name="${block.BlockName}">${block.BlockName}</option>`;
        });
    } catch (error) {
        console.error("Could not populate blocks dropdown:", error);
    }
}

async function loadDashboardData() {
    try {
        const response = await fetch(API_URL);
        const result = await response.json();

        if (response.ok) {
            document.getElementById('statTotal').innerText = result.metrics.total;
            document.getElementById('statActive').innerText = result.metrics.active;
            document.getElementById('statInactive').innerText = result.metrics.inactive;
            document.getElementById('statActivePct').innerText = `${result.metrics.activePercentage}% of total enrolled`;
            allStudents = result.data;
            renderTable(allStudents);
        }
    } catch (error) {
        console.error("Frontend could not reach the API:", error);
    }
}

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
                <button onclick="openUpdateModal(${student.StudentID})" style="background: #1e5a96; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-right: 5px; font-size: 12px; font-weight: bold;">Update</button>
                <button onclick="deleteStudent(${student.StudentID})" style="background: #dc3545; color: white; border: none; padding: 5px 8px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;">Delete</button>
            </td>
        </tr>`;
        tbody.innerHTML += row;
    });
}


const inputStyle = `width:100%; padding:10px 12px; border-radius:8px; border:1px solid #d4c5b9; font-size:14px; margin-bottom:14px; background:#faf8f5; outline:none; transition:border-color .15s,box-shadow .15s; box-sizing:border-box;`;
const selectStyle = `${inputStyle} appearance:none; background-image:linear-gradient(45deg,transparent 50%,#7a8fa6 50%),linear-gradient(135deg,#7a8fa6 50%,transparent 50%); background-position:calc(100% - 18px) calc(1em + 2px),calc(100% - 13px) calc(1em + 2px); background-size:6px 6px,6px 6px; background-repeat:no-repeat; padding-right:36px;`;
const labelStyle = `font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.6px; color:#2c3e50; display:block; margin-bottom:4px;`;

function injectUpdateModal() {
    const modalHTML = `
    <div id="updateModalOverlay" style="display:none; position:fixed; inset:0; z-index:9999; background:rgba(15,23,42,0.45); backdrop-filter:blur(3px); align-items:center; justify-content:center;">
        <div style="background:#fff; border-radius:14px; width:100%; max-width:460px; max-height:90vh; overflow-y:auto; box-shadow:0 24px 60px rgba(15,23,42,0.22); animation:modalIn 0.22s cubic-bezier(.4,0,.2,1);">

            <!-- Header -->
            <div style="background:linear-gradient(135deg,#1e5a96,#144a7a); padding:20px 24px; display:flex; justify-content:space-between; align-items:center; position:sticky; top:0; z-index:1;">
                <div>
                    <h2 style="margin:0; color:#fff; font-size:18px; font-weight:700;">Update Student</h2>
                    <p id="modalStudentName" style="margin:4px 0 0; color:rgba(255,255,255,0.8); font-size:13px;"></p>
                </div>

            </div>

            <!-- Body -->
            <div style="padding:24px;">
                <input type="hidden" id="modalStudentId">

                <!-- PERSONAL INFORMATION -->
                <p style="margin:0 0 14px; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; color:#ff6b4a; border-bottom:2px solid #ff6b4a; padding-bottom:6px;">Personal Information</p>

                <label style="${labelStyle}">Student Number</label>
                <input type="text" id="modalStudentNum" placeholder="e.g. 2024-10042" style="${inputStyle}">

                <label style="${labelStyle}">First Name</label>
                <input type="text" id="modalFn" placeholder="e.g. Maria" style="${inputStyle}">

                <label style="${labelStyle}">Last Name</label>
                <input type="text" id="modalLn" placeholder="e.g. Santos" style="${inputStyle}">

                <label style="${labelStyle}">Email Address</label>
                <input type="email" id="modalMail" placeholder="e.g. maria@student.edu" style="${inputStyle}">

                <!-- ACADEMIC INFORMATION -->
                <p style="margin:18px 0 14px; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; color:#ffb65d; border-bottom:2px solid #ffb65d; padding-bottom:6px;">Academic Information</p>

                <label style="${labelStyle}">Year and Block</label>
                <select id="modalBlockId" style="${selectStyle}">
                    <option value="">-- Select --</option>
                </select>

                <label style="${labelStyle}">Semester</label>
                <select id="modalSemester" style="${selectStyle}">
                    <option value="">-- Select --</option>
                    <option value="1st">1st Semester</option>
                    <option value="2nd">2nd Semester</option>
                </select>

                <label style="${labelStyle}">Status</label>
                <select id="modalStatus" style="${selectStyle} margin-bottom:22px;">
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                </select>

                <div style="display:flex; gap:10px;">
                    <button onclick="closeUpdateModal()" style="flex:1; padding:11px; border-radius:8px; border:1px solid #d4c5b9; background:#f5f0eb; color:#5a6b7a; font-weight:700; cursor:pointer; font-size:14px;">Cancel</button>
                    <button onclick="submitUpdate()" style="flex:1; padding:11px; border-radius:8px; border:none; background:linear-gradient(180deg,#1e5a96,#144a7a); color:#fff; font-weight:700; cursor:pointer; font-size:14px;">Save Changes</button>
                </div>
            </div>
        </div>
    </div>

    <style>
    @keyframes modalIn {
        from { opacity:0; transform:scale(0.95) translateY(10px); }
        to   { opacity:1; transform:scale(1) translateY(0); }
    }
    #updateModalOverlay.open { display:flex !important; }
    #modalStudentNum:focus, #modalFn:focus, #modalLn:focus, #modalMail:focus,
    #modalBlockId:focus, #modalSemester:focus, #modalStatus:focus {
        border-color:#ff6b4a; box-shadow:0 0 0 3px rgba(255,107,74,0.1);
    }
    </style>`;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('updateModalOverlay').addEventListener('click', function(e) {
        if (e.target === this) closeUpdateModal();
    });
}

function openUpdateModal(studentId) {
    const student = allStudents.find(s => s.StudentID === studentId);
    if (!student) return;

    document.getElementById('modalStudentId').value = studentId;
    document.getElementById('modalStudentName').textContent = `${student.FirstName} ${student.LastName} · ${student.StudentNumber}`;

    // Personal info
    document.getElementById('modalStudentNum').value = student.StudentNumber || '';
    document.getElementById('modalFn').value = student.FirstName || '';
    document.getElementById('modalLn').value = student.LastName || '';
    document.getElementById('modalMail').value = student.Email || '';

    const blockSelect = document.getElementById('modalBlockId');
    for (let opt of blockSelect.options) {
        if (opt.getAttribute('data-name') === student.BlockName || opt.text === student.BlockName) {
            blockSelect.value = opt.value;
            break;
        }
    }

    // Semester
    let sem = student.Semester;
    if (sem == '1' || sem == '1st') sem = '1st';
    if (sem == '2' || sem == '2nd') sem = '2nd';
    document.getElementById('modalSemester').value = sem;

    // Status
    document.getElementById('modalStatus').value = student.IsActive == 1 ? 'Active' : 'Inactive';

    document.getElementById('updateModalOverlay').classList.add('open');
}

function closeUpdateModal() {
    document.getElementById('updateModalOverlay').classList.remove('open');
}

async function submitUpdate() {
    const studentId   = document.getElementById('modalStudentId').value;
    const studentNum  = document.getElementById('modalStudentNum').value.trim();
    const fn          = document.getElementById('modalFn').value.trim();
    const ln          = document.getElementById('modalLn').value.trim();
    const mail        = document.getElementById('modalMail').value.trim();
    const blockId     = document.getElementById('modalBlockId').value;
    const semester    = document.getElementById('modalSemester').value;
    const status      = document.getElementById('modalStatus').value;

    // Validate
    if (!isValidStudentNumber(studentNum)) { alert('Student number format must be YYYY-NNNNN (e.g. 2024-10042)'); return; }
    if (!isValidName(fn))  { alert('First name must contain letters only, min 2 characters.'); return; }
    if (!isValidName(ln))  { alert('Last name must contain letters only, min 2 characters.'); return; }
    if (!isValidEmail(mail)) { alert('Enter a valid email address.'); return; }
    if (!blockId)  { alert('Please select a block.'); return; }
    if (!semester) { alert('Please select a semester.'); return; }

    // Duplicate checks (exclude current student)
    const others = allStudents.filter(s => s.StudentID != studentId);
    if (others.find(s => s.StudentNumber.toLowerCase() === studentNum.toLowerCase())) {
        alert(`Student number ${studentNum} already exists.`); return;
    }
    if (others.find(s => s.Email.toLowerCase() === mail.toLowerCase())) {
        alert(`Email ${mail} is already registered.`); return;
    }
    if (others.find(s => s.FirstName.toLowerCase() === fn.toLowerCase() && s.LastName.toLowerCase() === ln.toLowerCase())) {
        alert(`A student named ${fn} ${ln} already exists.`); return;
    }

    // Derive year level from selected block name
    const blockSelect = document.getElementById('modalBlockId');
    const blockName = blockSelect.options[blockSelect.selectedIndex]?.text || '';
    const yearMatch = blockName.match(/(\d)/);
    const yearMap = { '1': '1st Year', '2': '2nd Year', '3': '3rd Year', '4': '4th Year' };
    const derivedYearLevel = yearMatch ? yearMap[yearMatch[1]] : '';

    const updateData = { studentNum, fn, ln, mail, blockId, yearLevel: derivedYearLevel, semester, status };

    try {
        const response = await fetch(`${API_URL}/${studentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });

        const result = await response.json();
        if (response.ok) {
            closeUpdateModal();
            await loadDashboardData();
        } else {
            alert('Error: ' + (result.error || 'Could not update student.'));
        }
    } catch (error) {
        alert("Could not reach the server. Please check your backend supports PUT /api/students/:id");
    }
}

function filterStudentTable() {
    const searchTerm = document.getElementById('searchBox').value.toLowerCase();
    const selectedBlock = document.getElementById('filterBlock').value;

    const filteredResult = allStudents.filter(student => {
        const matchesSearch =
            student.FirstName.toLowerCase().includes(searchTerm) ||
            student.LastName.toLowerCase().includes(searchTerm) ||
            student.StudentNumber.toLowerCase().includes(searchTerm) ||
            student.StudentID.toString().includes(searchTerm);
        const matchesBlock = (selectedBlock === 'All' || student.BlockName === selectedBlock);
        return matchesSearch && matchesBlock;
    });

    renderTable(filteredResult);
}

document.getElementById('studentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllErrors();

    const studentNum = document.getElementById('studentNum').value.trim();
    const fn = document.getElementById('fn').value.trim();
    const ln = document.getElementById('ln').value.trim();
    const mail = document.getElementById('mail').value.trim();
    const blockId = document.getElementById('blockId').value;
    const semester = document.getElementById('semester').value;

    let hasError = false;

    if (!isValidStudentNumber(studentNum)) { showError('studentNum', 'Format must be YYYY-NNNNN (e.g. 2024-10042)'); hasError = true; }
    if (!isValidName(fn)) { showError('fn', 'First name must contain letters only, min 2 characters.'); hasError = true; }
    if (!isValidName(ln)) { showError('ln', 'Last name must contain letters only, min 2 characters.'); hasError = true; }
    if (!isValidEmail(mail)) { showError('mail', 'Enter a valid email address.'); hasError = true; }
    if (!blockId || blockId === '') { showError('blockId', 'Please select a block.'); hasError = true; }
    if (!semester) { showError('semester', 'Please select a semester.'); hasError = true; }

    if (hasError) return;

    const dupStudentNum = allStudents.find(s => s.StudentNumber.toLowerCase() === studentNum.toLowerCase());
    if (dupStudentNum) { showError('studentNum', `Student number ${studentNum} already exists.`); return; }

    const dupEmail = allStudents.find(s => s.Email.toLowerCase() === mail.toLowerCase());
    if (dupEmail) { showError('mail', `Email ${mail} is already registered.`); return; }

    const dupName = allStudents.find(s =>
        s.FirstName.toLowerCase() === fn.toLowerCase() &&
        s.LastName.toLowerCase() === ln.toLowerCase()
    );
    if (dupName) { showError('fn', `A student named ${fn} ${ln} already exists.`); showError('ln', ' '); return; }

    const selectedBlockOption = document.querySelector('#blockId option:checked');
    const blockName = selectedBlockOption ? selectedBlockOption.text : '';
    const yearMatch = blockName.match(/(\d)/);
    const yearMap = { '1': '1st Year', '2': '2nd Year', '3': '3rd Year', '4': '4th Year' };
    const derivedYearLevel = yearMatch ? yearMap[yearMatch[1]] : '';

    const formData = {
        studentNum, fn, ln, mail, blockId,
        yearLevel: derivedYearLevel,
        semester,
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
            clearAllErrors();
            loadDashboardData();
        } else {
            alert("Error: " + result.error);
        }
    } catch (error) {
        alert("Frontend couldn't communicate with the backend server.");
    }
});

async function deleteStudent(id) {
    if (confirm("Are you sure you want to permanently delete this student record?")) {
        try {
            const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
            const result = await response.json();
            if (response.ok) { alert(result.message); loadDashboardData(); }
            else alert(result.error);
        } catch (error) {
            alert("Error deleting student from data schema.");
        }
    }
}
