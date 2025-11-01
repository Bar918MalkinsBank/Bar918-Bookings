// Table selection and visual feedback
const tables = document.querySelectorAll('.table-btn');
tables.forEach(btn => {
  btn.addEventListener('click', () => {
    tables.forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    console.log(`Selected table: ${btn.dataset.table}`);
  });
});

// Example: Fetch availability from your Apps Script if desired
async function fetchAvailability() {
  try {
    const response = await fetch('https://script.google.com/macros/s/AKfycbxALplsL1YhvjozZcJrd68-wZ_J8lG0IavP-B9xY26LD8ug7KnTAF5_gOcC3S5Ktp5S/exec');
    const data = await response.json();

    data.forEach(row => {
      const table = document.querySelector(`[data-table="${row.table}"]`);
      if (table) {
        if (row.status === 'Booked') table.style.background = '#e74c3c';
        else if (row.status === 'Pending') table.style.background = '#f1c40f';
        else table.style.background = 'rgba(1,44,78,0.9)';
      }
    });
  } catch (e) {
    console.error('Error fetching availability', e);
  }
}

fetchAvailability();
