import nodemailer from "nodemailer";
import { envVars } from "../config/env";

export const transporter = nodemailer.createTransport({
  service: "gmail", // Use your email provider
  auth: {
    user: envVars.GMAIL.EMAIL,
    pass: envVars.GMAIL.APP_PASSWORD,
  },
});

export const sendEmail = async (to: string, subject: string, text: string) => {
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px; }
        .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: white; }
        .footer { text-align: center; padding: 20px; color: #666; }
        .button { background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Update from PaisaHiPaisa</h2>
        </div>
        <div class="content">
            <h4>${text}</h4>
            <hr />
            <a href="${envVars.FRONTEND_URL}/login">
            <button class="button">Login</button>
            </a>
            <p>If you did not request this change, please contact our support team immediately.</p>
            <p>Thank you,<br/>The PaisaHiPaisa Team</p>
        </div>
        <div class="footer">
          <p>&copy; 2025 PaisaHiPaisa. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  try {
    const mailOptions = {
      from: envVars.GMAIL.EMAIL,
      to,
      subject,
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully!");
  } catch (error) {
    console.error("Error sending email:", error);
  }
};
