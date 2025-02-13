require("dotenv").config();
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const nodemailer = require("nodemailer");

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

// Check Database Connection
async function checkDBConnection() {
    try {
        await prisma.$connect();
        console.log("✅ Successfully connected to the database.");
    } catch (error) {
        console.error("❌ Database connection failed:", error);
        process.exit(1); // Exit if DB connection fails
    }
}
checkDBConnection();

// Email Service
const sendEmail = async (referName, referryName, referEmail) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASS,
        },
    });

    const mailOptions = {
        from: process.env.GMAIL_USER,
        to: referEmail,
        subject: "You have been referred!",
        text: `Hello ${referryName},\n\n${referName} has referred you. Good luck!\n\nBest Regards.`,
    };

    await transporter.sendMail(mailOptions);
};

// Referral POST Route
app.post("/refer", async (req, res) => {
    const { referName, referryName, referEmail, mobile } = req.body;

    // Validation
    if (!referName || !referryName || !referEmail || !mobile) {
        return res.status(400).json({ error: "All fields are required" });
    }

    try {
        const existingReferral = await prisma.referral.findUnique({
            where: { referEmail },
        });

        if (existingReferral) {
            return res.status(409).json({ error: "This email has already been referred!" });
        }
        // Store in DB
        const newReferral = await prisma.referral.create({
            data: { referName, referryName, referEmail, mobile },
        });

        console.log("✅ Referral saved:", newReferral);

        // Send Email
        await sendEmail(referName, referryName, referEmail);
        console.log("📧 Email sent to:", referEmail);

        res.status(201).json({ message: "Referral sent successfully!", data: newReferral });
    } catch (error) {
        console.error("❌ Error processing referral:", error);
        res.status(500).json({ error: "Error processing referral" });
    }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
