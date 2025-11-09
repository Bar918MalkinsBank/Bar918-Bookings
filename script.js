// booking page script with loading overlay protection and time validation
const WEBHOOK = 'https://script.google.com/macros/s/AKfycbxALplsL1YhvjozZcJrd68-wZ_J8S/exec';
const EMAILJS_SERVICE = 'Service_Reservations';
const EMAILJS_TEMPLATE = 'Table_Template';
const STAFF_EMAIL = 'bar918.malkinsbank@gmail.com';

const LEFT = [{id:7,seats:4},{id:8,seats:4},{id:9,seats:4},{id:10,seats:4},{id:11,seats:4},{id:12,seats:4},{id:13,seats:4},{id:14,seats:6},{id:15,seats:4}];
const RIGHT = [{id:1,seats:4},{id:2,seats:6},{id:3,seats:4},{id:4,seats:4},{id:5,seats:4},{id:6,seats:6}];
const SNUGS = [{id:'S1',seats:2},{id:'S2',seats:2},{id:'S3',seats:2}];

function makeCard(t){
  const d = document.createElement('button');
  d.type='button';
  d.className='table';
  d.dataset.id = t.id;
  d.dataset.seats = t.seats;
  d.innerHTML = (typeof t.id === 'string' ? t.id : 'Table ' + t.id) + '<small>'+t.seats+' seats</small>';
  d.addEventListener('click', () => {
    if(d.classList.contains('booked')) return;
    document.querySelectorAll('.table').forEach(x=>x.classList.remove('selected'));
    d.classList.add('selected');
    document.getElementById('table').value = t.id;
    const guestsEl = document.getElementById('guests');
    if(!guestsEl.dataset.touched) guestsEl.value = t.seats;
  });
  return d;
}
function renderLayout(){
  const left = document.getElementById('leftSection'), right = document.getElementById('rightSection'), snug = document.getElementById('snugSection');
  left.innerHTML=''; right.innerHTML=''; snug.innerHTML='';
  LEFT.forEach(t=>left.appendChild(makeCard(t)));
  RIGHT.forEach(t=>right.appendChild(makeCard(t)));
  SNUGS.forEach(t=>snug.appendChild(makeCard(t)));
}
renderLayout();

document.getElementById('guests').addEventListener('change', ()=>document.getElementById('guests').dataset.touched = '1');

function showPleaseWait(on){
  const overlay = document.getElementById('pleaseWaitOverlay');
  const submit = document.getElementById('submitBtn');
  if(on){ overlay.style.display='flex'; submit.disabled = true; }
  else { overlay.style.display='none'; submit.disabled = false; }
}

function toast(msg){ alert(msg); }

function isTimeWithinAllowedHours(selectedDate, selectedTime){
  if(!selectedDate || !selectedTime) return false;
  const day = new Date(selectedDate).getDay(); // 0 = Sunday
  const [hour, minute] = selectedTime.split(':').map(Number);
  const selectedMinutes = hour * 60 + minute;
  const openMinutes = 10 * 60; // 10:00
  const closeMinutes = (day === 0) ? (18 * 60) : (20 * 60); // Sunday 18:00, others 20:00
  return selectedMinutes >= openMinutes && selectedMinutes <= closeMinutes;
}

document.getElementById('bookingForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const date = document.getElementById('date').value;
  const time = document.getElementById('time').value;
  const table = document.getElementById('table').value;
  const guests = document.getElementById('guests').value;
  const babySeat = document.getElementById('babySeat').value;
  const notes = document.getElementById('notes').value.trim();
  if(!table){ return toast('Please select a table'); }

  // enforce time windows
  if(!isTimeWithinAllowedHours(date, time)){
    toast('Bookings are available only between 10:00–20:00 (Sundays 10:00–18:00).');
    return;
  }

  const booking = {
    name, email, phone, date, time, table, guests,
    contact: (phone ? phone : '') + (email ? (' / ' + email) : ''),
    notes: 'Baby seat: ' + babySeat + (notes ? ' — ' + notes : '')
  };

  showPleaseWait(true);

  try {
    const resp = await fetch(WEBHOOK, {
      method:'POST',
      headers:{'Content-Type':'text/plain;charset=utf-8'},
      body: JSON.stringify({ action:'createBooking', booking })
    });
    const txt = await resp.text();

    if(txt && txt.startsWith('rejected')){
      toast('Sorry — booking unavailable (' + txt.split(':')[1] + ').');
      showPleaseWait(false);
      return;
    }
    if(txt && txt.startsWith('success')){
      // send emails
      const paramsCustomer = {
        name: booking.name,
        date: booking.date,
        time: booking.time,
        table: booking.table,
        guests: booking.guests,
        babySeat: babySeat,
        specialRequests: notes,
        email: booking.email,
        to_email: booking.email
      };
      await emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, paramsCustomer);

      const paramsStaff = Object.assign({}, paramsCustomer, {{'to_email': STAFF_EMAIL, 'email': STAFF_EMAIL}});
      await emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, paramsStaff);

      toast('Booking confirmed — confirmation email sent.');
      e.target.reset();
      document.querySelectorAll('.table').forEach(t=>t.classList.remove('selected'));
      document.getElementById('table').value = '';
      showPleaseWait(false);
      return;
    }
    toast('Unexpected server response: ' + txt);
  } catch(err){
    console.error(err);
    toast('Network error while saving booking — try again.');
  } finally {
    showPleaseWait(false);
  }
});