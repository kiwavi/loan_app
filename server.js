const express = require("express");
const app = express();
const dotenv = require("dotenv");
const bodyParser = require("body-parser");

app.use(bodyParser.json());

dotenv.config();
const port = process.env.PORT;

app.get("/", async (req, res) => {
  return res.status(200).json({ success: true, message: "True" });
});

app.listen(port, () => {
  console.log(
    `[server]: Server is running at http://localhost:${port || 3000}`
  );
});
