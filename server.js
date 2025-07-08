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
const morgan = require("morgan");
app.use(morgan("combined"));

dotenv.config();
const port = process.env.PORT;

app.get("/", async (req, res) => {
  return res.status(200).json({ success: true, message: "Hello world" });
});

app.post(
  "/client",
  body(["phone_number"])
    .notEmpty()
    .withMessage("Phone number is required")
    .isMobilePhone("en-KE"),
  body(["full_name"])
    .notEmpty()
    .isString()
    .withMessage("Full name must be provided"),
  async (req, res) => {
    try {
      const result = validationResult(req);
      if (result.isEmpty()) {
        let data = matchedData(req);
        let { phone_number, full_name } = data;

        let checkclients = await prisma.clients.findFirst({
          where: {
            deleted_at: null,
            phone_number,
          },
        });

        if (checkclients) {
          return res
            .status(400)
            .json({ success: false, message: "Active client already exists" });
        }

        let client;

        try {
          client = await prisma.clients.create({
            data: {
              phone_number,
              full_name,
            },
            select: {
              uid: true,
              phone_number: true,
              full_name: true,
            },
          });
        } catch (e) {
          if (e.code === "P2002") {
            // unique constraint error
            return res.status(400).json({
              success: false,
              message: "Account already exists but deactivated",
            });
          }
        }
        return res.status(200).json({ success: true, data: client });
      }

      return res.status(400).json({
        message: "validation failed",
        validationErrors: result
          .array()
          .map((error) => `${error.path}(${error.location}): ${error.msg}`),
      });
    } catch (e) {
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }
);

app.delete(
  "/client",
  query("uid").notEmpty().withMessage("You must supply a unique ID"),
  async (req, res) => {
    try {
      const result = validationResult(req);
      if (result.isEmpty()) {
        let data = matchedData(req);
        let { uid } = data;

        let client = await prisma.clients.findFirst({
          where: {
            uid,
            deleted_at: null,
          },
        });

        if (!client) {
          return res
            .status(400)
            .json({ success: true, message: "Client not found" });
        }

        let deleted_client = await prisma.clients.update({
          where: {
            id: client.id,
          },
          data: {
            deleted_at: new Date(),
          },
        });

        return res
          .status(200)
          .json({ success: true, message: "Client successfully deactivated" });
      }

      return res.status(400).json({
        message: "validation failed",
        validationErrors: result
          .array()
          .map((error) => `${error.path}(${error.location}): ${error.msg}`),
      });
    } catch (e) {
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }
);

app.listen(port, () => {
  console.log(
    `[server]: Server is running at http://localhost:${port || 3000}`
  );
});
