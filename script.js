const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbxALplsL1YhvjozZcJrd68-wZ_J8lG0IavP-B9xY26LD8ug7KnTAF5_gOcC3S5Ktp5S/exec";
const EMAIL_SERVICE = "Service_Reservations";
const EMAIL_TEMPLATE = "Table_Template";
const EMAIL_PUBLIC_KEY = "aypCqsVVHRqzqReCk";

const tables = document.querySelectorAll(".table-btn");
let selectedTable = null;

tables.forEach((btn) => {
  btn.addEventListener("click", () => {
    tables.forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
    selectedTable = btn.dataset.table;
    console.log(`Selected table: ${selectedTable}`);
  });
});

// Fetch booking status from Google Sheet
async function fetchAvailability() {
  try {
    const response = await fetch(WEBHOOK_URL);
    const data = await response.json();

    data.forEach(row => {
      const table = document.querySelector(`[data-table="${row.Table}"]`);
      if (table) {
        switch (row.Status) {
          case 'Booked':
            table.style.background = '#e74c3c';
            break;
          case 'Pending':
            table.style.background = '#f1c40f';
            break;
          default:
            table.style.background = 'rgba(1,44,78,0.9)';
        }
      }
    });
  } catch (err) {
    console.error("Error fetching availability:", err);
  }
}

fetchAvailability();

// 1.5-hour cooldown enforcement
function isWithinCooldown(lastBookingTime) {
  const now = new Date();
  const bookedTime = new Date(lastBookingTime);
  const diffHours = (now - bookedTime) / (1000 * 60 * 60);
  return diffHours < 1.5;
}
