import nodemailer from "nodemailer";
import { CONFIG } from "../config/config.js";

export async function sendEmail(mailConfig) {

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: CONFIG.mail.user,
      clientId: CONFIG.mail.clientId,
      clientSecret: CONFIG.mail.clientSecret,
      refreshToken: CONFIG.mail.refreshToken,
    },
  });

  const options = {
    from: CONFIG.mail.user,
    to: mailConfig.to,
    subject: mailConfig.subject,
    html: mailConfig.html,
    attachments: mailConfig.attachments,
  };

  return await transporter.sendMail(options);
}
