
const SHEET_ID = '1qfbq_iupQZisfjqxKDdbRJuam0OBOktNrYvapheMrjI';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`;

async function countSubjects() {
    try {
        const response = await fetch(CSV_URL);
        const text = await response.text();
        const rows = text.split('\n').slice(1);
        const subjects = new Set();
        rows.forEach(row => {
            const subject = row.split(',')[0].trim();
            if (subject) subjects.add(subject);
        });
        console.log("Total Subjects:", subjects.size);
        console.log("Subjects List:", Array.from(subjects));
    } catch (e) {
        console.error(e);
    }
}

countSubjects();
