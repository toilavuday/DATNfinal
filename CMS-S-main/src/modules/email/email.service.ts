// src/mail/mail.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter;
  private readonly emailUser: string;
  private readonly emailPass: string;

  constructor() {
    this.emailUser = process.env.EMAIL_USER?.trim() || '';
    this.emailPass = process.env.EMAIL_PASS?.replace(/\s/g, '') || '';

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.emailUser,
        pass: this.emailPass,
      },
    });
  }

  async sendMail(
    to: string,
    subject: string,
    text: string,
    html?: string,
  ): Promise<void> {
    if (!this.emailUser) {
      throw new InternalServerErrorException('EMAIL_USER is not configured');
    }

    if (!this.emailPass || this.emailPass.length < 16) {
      throw new InternalServerErrorException(
        'EMAIL_PASS must be a Gmail App Password',
      );
    }

    const mailOptions = {
      from: this.emailUser,
      to,
      subject,
      text,
      html,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully');
    } catch (error) {
      console.error('Error sending email:', error);
      throw new InternalServerErrorException('Cannot send password reset email');
    }
  }
}
