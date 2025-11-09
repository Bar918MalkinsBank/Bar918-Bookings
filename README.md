Bar918 Reservation System - Updated
Generated: 2025-11-03T22:40:24.246004 UTC

Files:
- booking.html
- employee.html
- style.css
- script.js
- employee.js
- code.gs

Deploy:
1) Google Sheets: ensure the spreadsheet with ID specified in code.gs exists.
2) Apps Script: paste code.gs into a new project, Deploy -> New deployment -> Web app (Execute as: Me, Access: Anyone)
3) Update WEBHOOK in script.js and employee.js if your exec URL differs.
4) Host booking.html and employee.html on GitHub Pages (https://bar918malkinsbank.github.io/Bar918-Bookings/)
5) Embed in Squarespace via iframe.

EmailJS:
- Service ID: Service_Reservations
- Template ID: Table_Template
- Public Key: aypCqsVVHRqzqReCk
- Ensure your EmailJS template uses variable {to_email} in the To field and matches variables sent.

Notes:
- Loading overlay prevents duplicate submissions.
- Employee portal shows bookings list and floor plan; supports blocking dates and closing days.
