'use server';
import nodemailer from 'nodemailer';

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  host: 'lablaboman.live',
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: 'noreply@lablaboman.live',
    pass: process.env.SMTP_PASSWORD,
  },
});

interface EmailParams {
  to: string[];
  title: string;
  body: string;
}

export async function sendEmail({ to, title, body }: EmailParams): Promise<{ success: boolean; message: string }> {
  try {
    await transporter.sendMail({
      from: '"LabLaboman" <noreply@lablaboman.live>',
      to: to.join(', '),
      subject: title,
      html: `<p>${body}</p>`
    });

    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, message: 'Failed to send email' };
  }
}