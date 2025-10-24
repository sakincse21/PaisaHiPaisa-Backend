"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = exports.transporter = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const env_1 = require("../config/env");
exports.transporter = nodemailer_1.default.createTransport({
    service: "gmail", // Use your email provider
    auth: {
        user: env_1.envVars.GMAIL.EMAIL,
        pass: env_1.envVars.GMAIL.APP_PASSWORD,
    },
});
const sendEmail = (to, subject, text) => __awaiter(void 0, void 0, void 0, function* () {
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
            <a href="${env_1.envVars.FRONTEND_URL}/login">
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
            from: env_1.envVars.GMAIL.EMAIL,
            to,
            subject,
            html: htmlContent,
        };
        yield exports.transporter.sendMail(mailOptions);
        console.log("Email sent successfully!");
    }
    catch (error) {
        console.error("Error sending email:", error);
    }
});
exports.sendEmail = sendEmail;
