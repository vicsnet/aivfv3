import nodemailer from 'nodemailer';

// Use a global symbol to store the transporter, making it resilient to hot-reloading
const G_TRANSPORTER_KEY = Symbol.for('aivf.nodemailer.transporter');

type GlobalWithTransporter = typeof globalThis & {
  [G_TRANSPORTER_KEY]?: nodemailer.Transporter;
}

const getTransporter = (): nodemailer.Transporter | undefined => {
  return (globalThis as GlobalWithTransporter)[G_TRANSPORTER_KEY];
};

const setTransporter = (transporter: nodemailer.Transporter) => {
  (globalThis as GlobalWithTransporter)[G_TRANSPORTER_KEY] = transporter;
};


// We'll create one test account and reuse it
const initializeMailer = async () => {
  if (getTransporter()) {
    return;
  }

  try {
    const testAccount = await nodemailer.createTestAccount();

    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    setTransporter(transporter);

    console.log('Nodemailer transporter created successfully.');
    console.log(`Ethereal test account ready: User: ${testAccount.user}`);

  } catch (error) {
    console.error('Failed to create nodemailer transporter:', error);
  }
};

const sendMail = async (options: { to: string; subject: string; html: string }) => {
  // Ensure the mailer is initialized
  if (!getTransporter()) {
    await initializeMailer();
  }
  
  const transporter = getTransporter();

  // Extra check in case initialization failed
  if (!transporter) {
    console.error('Mailer is not initialized. Cannot send email.');
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: `"AIVF Platform" <no-reply@aivf.app>`,
      ...options,
    });

    console.log('Message sent: %s', info.messageId);
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

// Initialize the mailer when the module is first loaded
initializeMailer();

export default sendMail; 