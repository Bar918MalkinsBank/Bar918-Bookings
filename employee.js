// employee portal script: date slider, bookings list, block/close toggles
const WEBHOOK = 'https://script.google.com/macros/s/AKfycbxALplsL1YhvjozZcJrd68-wZ_J8S/exec';

const LEFT = [{id:7,seats:4},{id:8,seats:4},{id:9,seats:4},{id:10,seats:4},{id:11,seats:4},{id:12,seats:4},{id:13,seats:4},{id:14,seats:6},{id:15,seats:4}];
const RIGHT = [{id:1,seats:4},{id:2,seats:6},{id:3,seats:4},{id:4,seats:4},{id:5,seats:4},{id:6,seats:6}];
const SNUGS = [{id:'S1',seats:2},{id:'S2',seats:2},{id:'S3',seats:2}];

function mkCard(t){ const el=document.createElement('div'); el.className='table'; el.dataset.table=t.id; el.innerHTML = t.id + '<div style="font-size:12px;margin-top:6px">'+t.seats+' seats</div>'; el.addEventListener('click', ()=>onTableClick(t.id)); return el; }
function renderFloor(){ const left=document.getElementById('leftFloor'), right=document.getElementById('rightFloor'), snug=document.getElementById('snugFloor'); left.innerHTML=''; right.innerHTML=''; snug.innerHTML=''; LEFT.forEach(t=>left.appendChild(mkCard(t))); RIGHT.forEach(t=>right.appendChild(mkCard(t))); SNUGS.forEach(s=>snug.appendChild(mkCard(s))); }
renderFloor();

const dateSelector = document.getElementById('dateSelector');
const prevDay = document.getElementById('prevDay');
const nextDay = document.getElementById('nextDay');
const blockToggle = document.getElementById('blockDateToggle');
const closeToggle = document.getElementById('closeBookingsToggle');
const refreshBtn = document.getElementById('refreshBtn');
const bookingsTbody = document.getElementById('bookingsTbody');

dateSelector.valueAsDate = new Date();

prevDay.addEventListener('click', ()=>changeDate(-1));
nextDay.addEventListener('click', ()=>changeDate(1));
refreshBtn.addEventListener('click', ()=>loadBookingsForDate(dateSelector.value));

async function changeDate(delta){
  const d = new Date(dateSelector.value);
  d.setDate(d.getDate() + delta);
  dateSelector.valueAsDate = d;
  await loadBookingsForDate(dateSelector.value);
}

async function loadBookingsForDate(date){
  bookingsTbody.innerHTML = '<tr><td colspan="9">Loading…</td></tr>';
  try{
    const res = await fetch(WEBHOOK + '?action=getBookings&date=' + encodeURIComponent(date));
    const data = await res.json();
    const bookings = data.bookings || [];
    const closed = data.closed || false;
    document.getElementById('closedBanner').style.display = closed ? 'block' : 'none';
    if(bookings.length === 0){ bookingsTbody.innerHTML = '<tr><td colspan="9">No bookings for this date</td></tr>'; } else {
      bookingsTbody.innerHTML = '';
      bookings.forEach(b=>{
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${b.Timestamp||''}</td><td>${b.Name||''}</td><td>${b.Date||''}</td><td>${b.Time||''}</td><td>${b.Table||''}</td><td>${b.Guests||''}</td><td>${b.Contact||''}</td><td>${b.Notes||''}</td><td><select data-row="${b._rowId}"><option ${b.Status==='Booked'?'selected':''}>Booked</option><option ${b.Status==='Seated'?'selected':''}>Seated</option><option ${b.Status==='Finished'?'selected':''}>Finished</option></select></td>`;
        bookingsTbody.appendChild(tr);
      });
    }
    document.querySelectorAll('.table').forEach(t=>{ t.className='table'; });
    bookings.forEach(b=>{
      const el = document.querySelector('.table[data-table="'+b.Table+'"]');
      if(!el) return;
      const s = (b.Status||'Booked').toLowerCase();
      if(s==='booked') el.classList.add('booked'); else if(s==='seated') el.classList.add('seated'); else if(s==='finished') el.classList.add('finished');
    });
    const closedRes = await fetch(WEBHOOK + '?action=isClosed&date=' + encodeURIComponent(date));
    const closedJson = await closedRes.json();
    blockToggle.checked = closedJson.closed;
    closeToggle.checked = closedJson.closed;
  }catch(err){
    console.error(err);
    bookingsTbody.innerHTML = '<tr><td colspan="9">Error loading bookings</td></tr>';
  }
}

dateSelector.addEventListener('change', ()=>loadBookingsForDate(dateSelector.value));

blockToggle.addEventListener('change', async ()=>{
  const date = dateSelector.value;
  const blocked = blockToggle.checked;
  await fetch(WEBHOOK, { method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body: JSON.stringify({ action:'blockDate', date, blocked })});
  await loadBookingsForDate(date);
});

closeToggle.addEventListener('change', async ()=>{
  const date = dateSelector.value;
  const closed = closeToggle.checked;
  await fetch(WEBHOOK, { method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body: JSON.stringify({ action:'closeDay', date })});
  await loadBookingsForDate(date);
});

document.addEventListener('change', async (e)=>{
  if(e.target.matches('select[data-row]')){
    const row = e.target.dataset.row;
    const status = e.target.value;
    await fetch(WEBHOOK, { method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body: JSON.stringify({ action:'updateStatusByRow', rowId: row, status })});
    await loadBookingsForDate(dateSelector.value);
  }
});

const modal = document.getElementById('modal');
document.getElementById('addBookingBtn').addEventListener('click', ()=>{
  const sel = document.getElementById('m_table'); sel.innerHTML = '';
  [...LEFT,...RIGHT,...SNUGS].forEach(t=>{ const opt = document.createElement('option'); opt.value = t.id; opt.textContent = t.id + ' ('+t.seats+' seats)'; sel.appendChild(opt); });
  document.getElementById('m_date').value = dateSelector.value;
  modal.style.display = 'flex';
});
document.getElementById('m_cancel').addEventListener('click', ()=> modal.style.display='none');
document.getElementById('m_save').addEventListener('click', async ()=>{
  const b = {
    name: document.getElementById('m_name').value.trim(),
    email: document.getElementById('m_email').value.trim(),
    phone: document.getElementById('m_phone').value.trim(),
    date: document.getElementById('m_date').value,
    time: document.getElementById('m_time').value,
    table: document.getElementById('m_table').value,
    guests: document.getElementById('m_guests').value || 1,
    notes: document.getElementById('m_notes').value || ''
  };
  b.contact = (b.phone ? b.phone : '') + (b.email ? (' / ' + b.email) : '');
  try{
    const res = await fetch(WEBHOOK, { method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body: JSON.stringify({ action:'createBooking', booking: b })});
    const txt = await res.text();
    if(txt.startsWith('success')){ modal.style.display='none'; await loadBookingsForDate(dateSelector.value); alert('Booking added'); } else alert('Error: '+txt);
  }catch(err){ console.error(err); alert('Save failed'); }
});

window.addEventListener('load', ()=>loadBookingsForDate(dateSelector.value));