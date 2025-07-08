const express = require("express");
const app = express();
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const {
  query,
  body,
  matchedData,
  validationResult,
} = require("express-validator");
const prisma = require("./prisma/client");

app.use(bodyParser.json());

dotenv.config();
const port = process.env.PORT;

app.get("/", async (req, res) => {
  return res.status(200).json({ success: true, message: "Hello world" });
});

app.post("/client", async (req, res) => {
  try {
  } catch (e) {}
});

app.listen(port, () => {
  console.log(
    `[server]: Server is running at http://localhost:${port || 3000}`
  );
});
