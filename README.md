# 💰 Loan Management System

This is a simple **Loan Management System** built using **Express.js**, **PostgreSQL**, and **Prisma ORM**.

---

## 🚀 Getting Started

Follow these steps to get the app up and running:

```bash
# 1. Clone the repository
git clone https://github.com/kiwavi/loan_app.git
cd loan_app

# 2. Install dependencies
npm install

# 3. Create a .env file in the root folder
touch .env

# 4. Add the following environment variables to .env
# (Replace with your actual credentials)
PORT=3000
DATABASE_URL=postgresql://postgres:yourpassword@127.0.0.1:5432/yourdbname?schema=public

# (Paste this to .env)
# This was inserted by `prisma init`:
[object Promise]

# 5. Initialize the database with Prisma
npx prisma migrate dev --name init

# 6. Start the application
node server.js
