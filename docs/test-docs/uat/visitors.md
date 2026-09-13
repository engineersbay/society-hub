# UAT — Visitors / gate pass

- [ ] Resident pre-registers visitor for own flat (phone required before pass)
- [ ] Resident or staff **issues pass** → sees QR + OTP + expiry once
- [ ] Visitor phone receives SMS and/or WhatsApp (or stub log in DEV)
- [ ] Staff Gate **preview** by pass token / QR shows name, flat, purpose, expiry
- [ ] Gate **verify** with QR (and OTP if required) checks visitor in
- [ ] Expired / revoked / used pass is rejected
- [ ] Staff revoke pass; cannot verify after revoke
- [ ] Check-out still works after pass verify
- [ ] History per flat; expected vs on-site badges
- [ ] Cross-tenant pass token / visitor id → **404**
- [ ] Flutter Gate + issue/share mirrors web for Admin / Resident
