# MailCMH – Gmail Email Extraction Tool

A Next.js app to extract and analyze emails from Gmail using IMAP with App Passwords.

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Generate a Gmail App Password
1. Enable 2-Factor Authentication on your Google account
2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Create an App Password for "Mail" (select "Other" and name it "MailCMH")
4. Copy the 16-character password (spaces are included, keep them or remove them)

### 3. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Features

### Email Extraction
- Connect to Gmail via IMAP using App Passwords (no OAuth needed)
- Set a custom start offset and count (e.g., emails 1–10, 11–20, etc.)
- Filter by Gmail categories: Primary, Social, Promotions, Updates, Forums, Spam

### Data Fields Extracted
- Full Email, Subdomain
- From Email, From Domain, From Name
- Subject, To Address, CC Address
- SPF / DKIM / DMARC Status
- Message ID, Return Path, Sender, Reply-To, In Reply To
- Content Type, MIME Version
- List ID, List Unsubscribe, Feedback ID

### UI Features
- 🔍 Real-time search across all fields
- 🏷 Filter by email category
- ↕ Sort by any column
- ⬇ Export to CSV
- 📋 Copy: IPs, Domains, grouped by Domain, grouped by IP

## Production Build
```bash
npm run build
npm start
```

## Notes
- Gmail IMAP must be enabled: Gmail Settings → See all settings → Forwarding and POP/IMAP → Enable IMAP
- The app fetches emails from INBOX by default (Gmail categories are server-side labels)
- All credentials stay on your machine / server — nothing is stored or logged
