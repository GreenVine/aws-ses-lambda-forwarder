import { hostname } from 'os';
import { SES } from 'aws-sdk';
import { simpleParser } from 'mailparser';
import { createTransport, Transporter, SendMailOptions } from 'nodemailer';

export interface EmailAttributes {
  messageId: string;
  checksum: string;
  timestamp: string;
}

class Mailer {
  static isEmailSafe(verdictOptions: {
    [key: string]: any;
  }): { safeIndex: -1 | 0 | 1; reason?: string } {
    if (verdictOptions) {
      const verdicts: { [key: string]: string } = {
        virusVerdict: 'VIRUS',
        spamVerdict: 'SPAM',
        dkimVerdict: 'DKIM ERROR',
        dmarcVerdict: 'DMARC ERROR'
      };

      for (const key of Object.keys(verdicts)) {
        const reason = verdicts[key];

        if (verdictOptions[key] && verdictOptions[key].status === 'FAIL') {
          if (key === 'virusVerdict') {
            // actively refuesd
            return { safeIndex: -1, reason };
          } else {
            // prepend warnings but still forward the email
            return { safeIndex: 0, reason };
          }
        }
      }
    }

    return { safeIndex: 1 };
  }

  private readonly transporter: Transporter;

  constructor() {
    this.transporter = createTransport({
      SES: new SES({
        apiVersion: '2010-12-01'
      })
    });
  }

  async parseMail(source: string) {
    return simpleParser(source);
  }

  async sendMail(options: SendMailOptions, attr: EmailAttributes) {
    return this.transporter.sendMail({
      ...options,
      headers: {
        'X-Original-MessageId': attr.messageId,
        'X-Original-SHA256': attr.checksum,
        'X-Original-Timestamp': attr.timestamp,
        'X-Forwarder-Node': hostname() || 'Unknown'
      }
    });
  }
}

export default Mailer;
