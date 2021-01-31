import nodemailer from 'nodemailer';

export async function sendEmail(to: string, text: string): Promise<void> {
  // const testAccount = await nodemailer.createTestAccount();
  // console.log(testAccount);

  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: 'thnldxmjef47cvrt@ethereal.email',
      pass: 'VSnwgKA9M4B4F1hpKW',
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const info = await transporter.sendMail({
    from: '"Aleksand Dargeev" <foo@example.com>',
    to,
    subject: 'Hello ✔',
    html: text,
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  console.log('Message sent: %s', info.messageId);
  console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
}

export default sendEmail;
