/** The exact Google Apps Script the user pastes into Extensions → Apps Script (v3: + settings/letterhead/lock tab) */
export const SCRIPT_VERSION = 9;

export const APPS_SCRIPT_CODE = `// ─────────────────────────────────────────────────────────────
//  Maintenance Khata → Google Sheet backend  (v9)
//  Four tabs: expenses, flats, collections & settings
//  (settings holds the letterhead + app-lock hash)
//  1. Extensions → Apps Script → paste this whole file
//  2. Save, then Deploy → New deployment → type "Web app"
//     Execute as: Me   ·   Who has access: Anyone
//  3. Copy the Web app URL (ends in /exec) into the app
//  (Updating an older script? Paste this, then
//   Deploy → Manage deployments → Edit → Version: New → Deploy)
// ─────────────────────────────────────────────────────────────

var VERSION = 9;

var TABS = {
  records:     { name: 'Maintenance Records',
                 headers: ['ID', 'Date', 'Category', 'Category Detail', 'Description',
                           'Vendor', 'Amount (INR)', 'Status', 'Payment Mode',
                           'Notes', 'Created At'] },
  flats:       { name: 'Flats',
                 headers: ['ID', 'Flat', 'Wing', 'Floor', 'Flat No', 'Occupancy',
                           'Resident', 'Members', 'Owner Name', 'Owner Mobile',
                           'Owner Email', 'Owner Address', 'Tenant Name',
                           'Tenant Mobile', 'Tenant From', 'Agreement',
                           'Emergency Name', 'Emergency Mobile', 'Vehicles',
                           'Notes', 'Monthly Amount (INR)', 'Family Members',
                           'Password Hash', 'Tenant Email', 'Tenant Address',
                           'Tenant Members', 'Tenant Family', 'Tenant Emg Name',
                           'Tenant Emg Mobile', 'Parking Slot'] },
  collections: { name: 'Collections',
                 headers: ['ID', 'Flat', 'Unit ID', 'Month', 'Amount (INR)',
                           'Paid On', 'Mode', 'Receipt', 'Notes', 'Created At'] },
  settings:    { name: 'Settings',
                 headers: ['Key', 'Value'] }
};

function sheet_(key) {
  var cfg = TABS[key];
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(cfg.name);
  if (!sheet) sheet = ss.insertSheet(cfg.name);
  if (sheet.getLastRow() === 0) sheet.appendRow(cfg.headers);
  return sheet;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function dateStr_(v) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  var s = String(v == null ? '' : v);
  var m = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  if (m) return m[1];
  var d = new Date(s);
  if (!isNaN(d.getTime())) {
    return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return s.slice(0, 10);
}

// Sheets auto-converts "2026-02" into a Date cell, so a month read back from
// the sheet can arrive as "Sat Feb 01 2026 ...". Normalise it, otherwise a
// paid due never matches its month and shows as pending again.
function monthStr_(v) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM');
  }
  var s = String(v == null ? '' : v).trim();
  var m = /^(\d{4})-(\d{1,2})/.exec(s);
  if (m) return m[1] + '-' + ('0' + m[2]).slice(-2);
  var d = new Date(s);
  if (!isNaN(d.getTime())) {
    return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM');
  }
  return s.slice(0, 7);
}

// ── App → GET → return everything ─────────────────────────────
function doGet() {
  var recs = sheet_('records').getDataRange().getValues();
  // Sheets written by an older script have no "Category Detail" column —
  // detect the layout from the header row so old rows still read correctly.
  var hasDetail = recs.length > 0 &&
    String(recs[0][3] || '').toLowerCase().indexOf('detail') !== -1;
  var records = [];
  for (var i = 1; i < recs.length; i++) {
    var r = recs[i];
    if (!r[0]) continue;
    var d = hasDetail ? 1 : 0; // column shift
    records.push({
      id: String(r[0]), date: dateStr_(r[1]),
      category: r[2], categoryDetail: hasDetail ? (r[3] || '') : '',
      description: r[3 + d], vendor: r[4 + d],
      amount: Number(r[5 + d]) || 0, status: r[6 + d] || 'paid',
      payment: r[7 + d] || '', notes: r[8 + d] || '',
      createdAt: Number(r[9 + d]) || i
    });
  }

  var fl = sheet_('flats').getDataRange().getValues();
  // Old sheets had only 4 flat columns — detect and read them too.
  var richFlats = fl.length > 0 && String(fl[0][2] || '').toLowerCase() === 'wing';
  var units = [];
  for (var j = 1; j < fl.length; j++) {
    var u = fl[j];
    if (!u[0]) continue;
    if (richFlats) {
      units.push({
        id: String(u[0]), label: String(u[1]), wing: u[2] || '',
        floor: Number(u[3]) || 0, flatNo: String(u[4] || ''),
        occupancy: u[5] || 'owner', resident: u[6] || '',
        members: Number(u[7]) || 0,
        ownerName: u[8] || '', ownerMobile: String(u[9] || ''),
        ownerEmail: u[10] || '', ownerAddress: u[11] || '',
        tenantName: u[12] || '', tenantMobile: String(u[13] || ''),
        tenantFrom: dateStr_(u[14]), tenantAgreement: u[15] || '',
        emergencyName: u[16] || '', emergencyMobile: String(u[17] || ''),
        vehicles: u[18] || '', notes: u[19] || '',
        amount: Number(u[20]) || 0,
        familyMembers: u[21] || '', passwordHash: String(u[22] || ''),
        tenantEmail: u[23] || '', tenantAddress: u[24] || '',
        tenantMembers: Number(u[25]) || 0, tenantFamilyMembers: u[26] || '',
        tenantEmergencyName: u[27] || '', tenantEmergencyMobile: String(u[28] || ''),
        parkingSlot: u[29] || ''
      });
    } else {
      units.push({ id: String(u[0]), label: String(u[1]), resident: u[2] || '',
                   amount: Number(u[3]) || 0 });
    }
  }

  var col = sheet_('collections').getDataRange().getValues();
  var payments = [];
  for (var k = 1; k < col.length; k++) {
    var p = col[k];
    if (!p[0]) continue;
    payments.push({
      id: String(p[0]), flat: String(p[1] || ''), unitId: String(p[2] || ''),
      month: monthStr_(p[3]), amount: Number(p[4]) || 0,
      paidOn: dateStr_(p[5]), mode: p[6] || '', receipt: p[7] || '',
      notes: p[8] || '', createdAt: Number(p[9]) || k
    });
  }

  var st = sheet_('settings').getDataRange().getValues();
  var meta = {};
  for (var m = 1; m < st.length; m++) {
    var key = String(st[m][0] || '').trim();
    if (key) meta[key] = String(st[m][1] == null ? '' : st[m][1]);
  }

  return json_({ ok: true, version: VERSION, meta: meta,
                 records: records, units: units, payments: payments });
}

// ── App → POST → replace sheet contents ───────────────────────
function write_(key, rows, mapFn) {
  var sheet = sheet_(key);
  sheet.clearContents();
  sheet.appendRow(TABS[key].headers);
  for (var i = 0; i < rows.length; i++) sheet.appendRow(mapFn(rows[i]));
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    if (body.records) write_('records', body.records, function (r) {
      return [r.id, r.date, r.category, r.categoryDetail || '', r.description,
              r.vendor, r.amount, r.status, r.payment, r.notes, r.createdAt];
    });
    if (body.units) write_('flats', body.units, function (u) {
      return [u.id, u.label, u.wing, u.floor, u.flatNo, u.occupancy,
              u.resident, u.members, u.ownerName, u.ownerMobile,
              u.ownerEmail, u.ownerAddress, u.tenantName, u.tenantMobile,
              u.tenantFrom, u.tenantAgreement, u.emergencyName,
              u.emergencyMobile, u.vehicles, u.notes, u.amount,
              u.familyMembers || '', u.passwordHash || '',
              u.tenantEmail || '', u.tenantAddress || '',
              u.tenantMembers || 0, u.tenantFamilyMembers || '',
              u.tenantEmergencyName || '', u.tenantEmergencyMobile || '',
              u.parkingSlot || ''];
    });
    if (body.payments) write_('collections', body.payments, function (p) {
      return [p.id, p.flat, p.unitId, p.month, p.amount,
              p.paidOn, p.mode, p.receipt, p.notes, p.createdAt];
    });
    if (body.meta) {
      var s = sheet_('settings');
      s.clearContents();
      s.appendRow(TABS.settings.headers);
      for (var key in body.meta) {
        if (Object.prototype.hasOwnProperty.call(body.meta, key) && key) {
          s.appendRow([key, String(body.meta[key] == null ? '' : body.meta[key])]);
        }
      }
    }
    return json_({ ok: true, version: VERSION,
                   count: (body.records || []).length });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}`;
