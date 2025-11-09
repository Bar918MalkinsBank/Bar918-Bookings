const SHEET_ID = '1-FSwF_skvrpnzhH3KoqEuuYC5BHZzSJF-yyqJt5kfc';
const BOOKING_SHEET = 'Bookings';
const CLOSED_SHEET = 'ClosedDates';
const SETTINGS_SHEET = 'Settings';

function ensureSheets(ss){
  if(!ss.getSheetByName(BOOKING_SHEET)){
    const s = ss.insertSheet(BOOKING_SHEET);
    s.appendRow(['Timestamp','Name','Date','Time','Table','Guests','Contact','Notes','Status']);
  }
  if(!ss.getSheetByName(CLOSED_SHEET)){
    ss.insertSheet(CLOSED_SHEET).appendRow(['Date']);
  }
  if(!ss.getSheetByName(SETTINGS_SHEET)){
    const st = ss.insertSheet(SETTINGS_SHEET);
    st.appendRow(['TableNumber','IsBlocked','LastBookedTime','Capacity','Section']);
  }
}

function doGet(e){
  const ss = SpreadsheetApp.openById(SHEET_ID);
  ensureSheets(ss);
  const action = e.parameter && e.parameter.action ? e.parameter.action : '';

  if(action === 'getBookings'){
    const date = e.parameter.date;
    return ContentService.createTextOutput(JSON.stringify({ bookings: getBookingsForDate(ss, date), closed: isDateClosed(ss, date) })).setMimeType(ContentService.MimeType.JSON);
  }
  if(action === 'isClosed'){
    const date = e.parameter.date;
    return ContentService.createTextOutput(JSON.stringify({ closed: isDateClosed(ss, date) })).setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(JSON.stringify({ status:'ok' })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e){
  const ss = SpreadsheetApp.openById(SHEET_ID);
  ensureSheets(ss);
  const payload = JSON.parse(e.postData.contents || '{}');
  const action = payload.action || '';

  if(action === 'createBooking'){
    const b = payload.booking;
    if(!b || !b.name || !b.date || !b.time || !b.table) return ContentService.createTextOutput('rejected: missing');

    if(isDateClosed(ss, b.date)) return ContentService.createTextOutput('rejected: closed');

    const rows = ss.getSheetByName(BOOKING_SHEET).getDataRange().getValues();
    const headers = rows.shift();
    const dateIdx = headers.indexOf('Date');
    const timeIdx = headers.indexOf('Time');
    const tableIdx = headers.indexOf('Table');
    const statusIdx = headers.indexOf('Status');

    const reqMs = new Date(b.date + 'T' + b.time).getTime();
    for(let i=0;i<rows.length;i++){
      const r = rows[i];
      if(String(r[tableIdx]) === String(b.table) && String(r[dateIdx]) === String(b.date)){
        const otherMs = new Date(String(r[dateIdx]) + 'T' + String(r[timeIdx])).getTime();
        const diffMin = Math.abs(reqMs - otherMs) / 60000;
        const st = r[statusIdx] ? String(r[statusIdx]) : 'Booked';
        if(diffMin < 90 && st !== 'Finished'){
          return ContentService.createTextOutput('rejected: overlap');
        }
      }
    }

    const sheet = ss.getSheetByName(BOOKING_SHEET);
    const now = new Date();
    const contactVal = b.contact || ((b.phone?b.phone:'') + (b.email? (' / ' + b.email):''));
    const notesVal = b.notes || '';
    const guestsVal = b.guests || (b.seats ? b.seats : '');
    sheet.appendRow([now, b.name, b.date, b.time, b.table, guestsVal, contactVal, notesVal, 'Booked']);

    updateSettingsLastBooked(ss, b.table, b.date + 'T' + b.time);

    return ContentService.createTextOutput('success');
  }

  if(action === 'updateStatusByRow'){
    const rowId = payload.rowId;
    const status = payload.status;
    if(!rowId) return ContentService.createTextOutput('missing-rowId');
    const sheet = ss.getSheetByName(BOOKING_SHEET);
    const headers = sheet.getDataRange().getValues()[0];
    const statusIdx = headers.indexOf('Status') + 1;
    sheet.getRange(parseInt(rowId,10), statusIdx).setValue(status);
    return ContentService.createTextOutput('ok');
  }

  if(action === 'setStatusForTable'){
    const table = payload.table;
    const date = payload.date;
    const status = payload.status;
    const sheet = ss.getSheetByName(BOOKING_SHEET);
    const data = sheet.getDataRange().getValues();
    const headers = data.shift();
    const dateIdx = headers.indexOf('Date');
    const tableIdx = headers.indexOf('Table');
    const statusIdx = headers.indexOf('Status');
    for(let i=0;i<data.length;i++){
      if(String(data[i][dateIdx]) === String(date) && String(data[i][tableIdx]) === String(table)){
        sheet.getRange(i+2, statusIdx+1).setValue(status);
        return ContentService.createTextOutput('success');
      }
    }
    return ContentService.createTextOutput('not-found');
  }

  if(action === 'blockDate'){
    const date = payload.date;
    const blocked = payload.blocked;
    const cs = ss.getSheetByName(CLOSED_SHEET);
    const vals = cs.getDataRange().getValues().map(r=>String(r[0]));
    if(blocked){
      if(!vals.includes(date)) cs.appendRow([date]);
    } else {
      for(let i=vals.length-1;i>=0;i--){ if(vals[i] === date) cs.deleteRow(i+1); }
    }
    return ContentService.createTextOutput('ok');
  }

  if(action === 'closeDay'){
    const date = payload.date;
    const cs = ss.getSheetByName(CLOSED_SHEET);
    const vals = cs.getDataRange().getValues().map(r=>String(r[0]));
    if(!vals.includes(date)) cs.appendRow([date]);
    return ContentService.createTextOutput('ok');
  }

  if(action === 'openDay'){
    const date = payload.date;
    const cs = ss.getSheetByName(CLOSED_SHEET);
    const vals = cs.getDataRange().getValues();
    for(let i=vals.length-1;i>=0;i--){ if(String(vals[i][0]) === String(date)) cs.deleteRow(i+1); }
    return ContentService.createTextOutput('ok');
  }

  if(action === 'setBlock'){
    const table = payload.table;
    const block = payload.block ? true : false;
    const s = ss.getSheetByName(SETTINGS_SHEET);
    const vals = s.getDataRange().getValues();
    const foundIdx = vals.findIndex(r => String(r[0]) === String(table));
    if(foundIdx >= 0){
      s.getRange(foundIdx+1, 2).setValue(block ? 'TRUE' : 'FALSE');
    } else {
      s.appendRow([table, block ? 'TRUE' : 'FALSE', '', '', '']);
    }
    return ContentService.createTextOutput('ok');
  }

  return ContentService.createTextOutput('unknown-action');
}

function getBookingsForDate(ss, date){
  const sheet = ss.getSheetByName(BOOKING_SHEET);
  const all = sheet.getDataRange().getValues();
  if(all.length <= 1) return [];
  const headers = all[0];
  const rows = all.slice(1);
  const bookings = [];
  for(let i=0;i<rows.length;i++){
    const r = rows[i];
    if(String(r[2]) === String(date)){
      const obj = {};
      for(let j=0;j<headers.length;j++) obj[headers[j]] = r[j];
      obj._rowId = i + 2;
      bookings.push(obj);
    }
  }
  return bookings;
}

function isDateClosed(ss, date){
  const cs = ss.getSheetByName(CLOSED_SHEET);
  if(!cs) return false;
  const vals = cs.getDataRange().getValues().map(r=>String(r[0]));
  return vals.includes(String(date));
}

function updateSettingsLastBooked(ss, table, iso){
  const s = ss.getSheetByName(SETTINGS_SHEET);
  const vals = s.getDataRange().getValues();
  for(let i=1;i<vals.length;i++){
    if(String(vals[i][0]) === String(table)){
      s.getRange(i+1,3).setValue(iso);
      return;
    }
  }
  s.appendRow([table,'FALSE',iso,'','']);
}