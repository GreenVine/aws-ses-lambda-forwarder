import { hostname } from 'os';
import { SES } from 'aws-sdk';
import { isEmpty } from 'lodash';
import { Attachment, Address } from 'nodemailer/lib/mailer';
import { simpleParser, ParsedMail, EmailAddress } from 'mailparser';
import { createTransport, Transporter, SendMailOptions } from 'nodemailer';

import { Payload } from './common';

export interface EmailAttributes {
  messageId: string;
  checksum: string;
  timestamp: string;
  oriSender: string;
}

export enum EmailSafetyIndex {
  ACCEPTED,
  NEUTRAL,
  REJECTED
}

class Mailer {
  static isEmailSafe(verdictOptions: Payload): { safeIndex: EmailSafetyIndex; reason?: string } {
    if (verdictOptions) {
      const verdicts: Payload = {
        virusVerdict: 'VIRUS',
        spamVerdict: 'SPAM',
        spfVerdict: 'SPF ERROR',
        dkimVerdict: 'DKIM ERROR',
        dmarcVerdict: 'DMARC ERROR'
      };

      for (const key of Object.keys(verdicts)) {
        const reason = verdicts[key];

        if (verdictOptions[key] && verdictOptions[key].status === 'FAIL') {
          if (key === 'virusVerdict') {
            // actively refuesd
            return { safeIndex: EmailSafetyIndex.REJECTED, reason };
          } else {
            // prepend warnings but still forward the email
            return { safeIndex: EmailSafetyIndex.NEUTRAL, reason };
          }
        }
      }
    }

    return { safeIndex: EmailSafetyIndex.ACCEPTED };
  }

  static processAttachments(messageId: string, raw: string, parsed: ParsedMail): Attachment[] {
    if (process.env.MAILER_ATTACH_ORIGINAL === '1') {
      // .eml file includes original attachments, attach itself will suffice
      return [
        {
          filename: `Original-${messageId}.eml`,
          content: raw
        }
      ];
    } else {
      // attach all original attachments manually
      return parsed.attachments.map((attach): Attachment => ({
        cid: attach.contentId,
        filename: attach.filename,
        content: attach.content,
        contentType: attach.contentType,
        contentDisposition: attach.contentDisposition
      }));
    }
  }

  static processFromAddress(addr: EmailAddress, senderName: string): Address {
    const { address, name } = addr;

    const formattedAddress = () => {
      if (!isEmpty(address) && isEmpty(name)) {
        return `${address} via ${senderName}`;
      } else if (isEmpty(address) && !isEmpty(name)) {
        return `${name} via ${senderName}`;
      } else if (!isEmpty(address) && !isEmpty(name)) {
        return `${name} at ${address} via ${senderName}`;
      }
    };

    return {
      address: process.env.MAILER_FROM_ADDRESS,
      name: formattedAddress() || senderName
    };
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
        'X-Original-Sender': attr.oriSender,
        'X-Forwarder-Node': hostname() || 'Unknown'
      }
    });
  }
}

export default Mailer;
