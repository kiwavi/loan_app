const express = require("express");
const app = express();
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const {
  query,
  body,
  matchedData,
  validationResult,
  check,
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

        try {
          let deleted_client = await prisma.clients.update({
            where: {
              id: client.id,
              loans: {
                none: {
                  active: true,
                },
              },
            },
            data: {
              deleted_at: new Date(),
            },
          });
        } catch (error) {
          if (error.code === "P2025") {
            return res
              .status(404)
              .json({ message: "Client has existing active loans." });
          } else {
            return res
              .status(500)
              .json({ success: false, message: "Internal server error" });
          }
        }

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
      console.log(e);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }
);

app.post(
  "/loan",
  body(["client_id"])
    .notEmpty()
    .isUUID()
    .withMessage("Valid client id must be supplied"),
  body(["amount"])
    .notEmpty()
    .isInt()
    .withMessage("Valid amount should be supplied"),
  check("amount")
    .isInt({ gt: 0 }) // positive integer
    .withMessage("Amount must be a positive integer.")
    .custom((value) => {
      if (parseInt(value) > 1000000) {
        throw new Error("Amount must not exceed 1,000,000.");
      }
      return true;
    }),
  async (req, res) => {
    try {
      const result = validationResult(req);
      if (result.isEmpty()) {
        let data = matchedData(req);
        let { client_id, amount } = data;

        // user must be a valid user
        let user = await prisma.clients.findFirst({
          where: {
            uid: client_id,
            deleted_at: null,
          },
        });

        if (!user) {
          return res
            .status(400)
            .json({ success: false, message: "Valid user not found" });
        }

        let loan;

        // create the loan with pessimistic concurrency control
        await prisma.$transaction(async (tx) => {
          let lockUser =
            await tx.$queryRaw`select * from "Clients" where id=${user.id} for update`;

          loan = await tx.Loans.create({
            data: {
              client_id: user.id,
              amount,
              approved: true,
            },
            select: {
              uid: true,
              amount: true,
              user: {
                select: {
                  full_name: true,
                  phone_number: true,
                },
              },
            },
          });
        });

        return res.status(200).json({ success: true, data: loan });
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

app.get("/loans", async (req, res) => {
  try {
    // fetch all active loans
    let loans = await prisma.loans.findMany({
      where: {
        deleted_at: null,
        active: true,
      },
    });

    return res
      .status(200)
      .json({ success: true, data: loans, count: loans.length });
  } catch (e) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

app.get("/loan-amount", async (req, res) => {
  try {
    let total_amount =
      await prisma.$queryRaw`select sum(amount::numeric) as total from "Loans" where deleted_at is null`;

    return res
      .status(200)
      .json({ success: true, data: { total: total_amount[0].amount } });
  } catch (e) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

app.listen(port, () => {
  console.log(
    `[server]: Server is running at http://localhost:${port || 3000}`
  );
});
