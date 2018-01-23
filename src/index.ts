import { createHash } from 'crypto';
import { Attachment } from 'nodemailer/lib/mailer';

import S3Kit from './s3';
import Mailer, { EmailSafetyIndex } from './mailer';
import { Payload, preflightCheck, result } from './common';

export async function handler(ev: Payload, ctx: Payload, cb: (err?: Error, data?: any) => void) {
  try {
    // preflight check for configuration
    const chk = preflightCheck(ev);
    if (chk instanceof Error) {
      return result(chk, null, cb);
    }

    // initialise instances and fetch records
    const s3 = new S3Kit();
    const mailer = new Mailer();
    const payload = ev.Records[0];
    const { ses: { mail: { messageId }, receipt } } = payload;

    // retrieve full email from S3 bucket
    const emailRaw = await s3.getObject(messageId);
    const emailParsed = await mailer.parseMail(emailRaw);
    const emailChecksum = createHash('sha256')
      .update(emailRaw)
      .digest('hex');
    const emailAsAttachment: Attachment = {
      filename: `Original-${messageId}.txt`,
      content: emailRaw
    };

    // check the security of inbound emails and reject malicious ones
    const { safeIndex, reason } = Mailer.isEmailSafe(receipt);
    switch (safeIndex) {
      case EmailSafetyIndex.NEUTRAL:
        emailParsed.subject = `[${reason}] ${emailParsed.subject}`;
        result(null, `Email with Message ID ${messageId} has failed ${reason} check`);
        break;
      case EmailSafetyIndex.REJECTED:
        return result(
          null,
          `Email with Message ID ${messageId} has been rejected due to ${reason}`,
          cb
        );
    }

    // real magic happenes here...
    await mailer.sendMail(
      {
        from: {
          name: process.env.MAILER_FROM_NAME || '',
          address: process.env.MAILER_FROM_ADDRESS
        },
        to: process.env.MAILER_TO_ADDRESS.split(','),
        replyTo: emailParsed.from.value[0] || process.env.MAILER_FROM_ADDRESS,
        bcc: process.env.MAILER_BCC_ADDRESS.split(','),
        html: emailParsed.html as string,
        text: emailParsed.text as string,
        subject: emailParsed.subject,
        attachments: [
          // attachments in original email
          ...emailParsed.attachments.map((attach): Attachment => ({
            cid: attach.contentId,
            filename: attach.filename,
            content: attach.content,
            contentType: attach.contentType,
            contentDisposition: attach.contentDisposition
          })),
          // attach original raw email as an additional attachment
          process.env.MAILER_ATTACH_ORIGINAL === '1' ? emailAsAttachment : undefined
        ]
      },
      {
        messageId,
        checksum: emailChecksum,
        timestamp: emailParsed.date.toISOString()
      }
    );

    return result(null, `Email with Message ID ${messageId} has been forwarded successfully`, cb);
  } catch (e) {
    return result(e, null, cb);
  }
}

exports = {
  handler
};
