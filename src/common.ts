import { isEmpty } from 'lodash';

export interface Payload {
  [key: string]: any;
}

export const envVariables: { [key: string]: string | undefined } = {
  AWS_REGION: undefined,
  AWS_ACCESS_KEY_ID: undefined,
  AWS_SECRET_ACCESS_KEY: undefined,
  S3_BUCKET: undefined,
  S3_OBJECT_PREFIX: '',
  MAILER_FROM_NAME: 'Email Forwarder',
  MAILER_FROM_ADDRESS: undefined,
  MAILER_TO_ADDRESS: undefined,
  MAILER_BCC_ADDRESS: '',
  MAILER_ATTACH_ORIGINAL: '0'
};

export function preflightCheck(ev: Payload): true | Error {
  if (!ev || !ev.Records || ev.Records.length < 1) {
    return new Error('Event not found');
  }

  if (!ev.Records[0].ses || !ev.Records[0].ses.mail || !ev.Records[0].ses.mail.messageId) {
    return new Error('Unexpected event received, SES service expected');
  }

  for (const key of Object.keys(envVariables)) {
    const fallback = envVariables[key];
    const actual = process.env[key];

    if ((actual === undefined || isEmpty(actual)) && fallback === undefined) {
      // required env variable is not set
      return new Error(`Required environment variable ${key} not present`);
    } else if (actual === undefined) {
      // use fallback value to replace env variable
      process.env[key] = fallback;
    }
  }

  return true;
}

export function result(err?: Error | null, data?: any, cb?: ((err?: Error, data?: any) => void)) {
  const timestamp = new Date().toISOString();

  if (err) {
    console.error(timestamp, err.message || 'Error');
  } else {
    if (process.env.NODE_ENV !== 'production') {
      console.log(timestamp, data);
    }
  }

  if (typeof cb === 'function') {
    return cb(err, data);
  }
}
