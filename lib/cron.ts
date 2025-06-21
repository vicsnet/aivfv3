import cron from 'node-cron';
import db from './db';
import sendMail from './mailer';

// Define types for protocol structure
interface Injection {
  dayOfPhase: number;
  medicationId: string;
  dosage: string;
  time: string;
}

interface Phase {
  name: string;
  duration: number;
  injections: Injection[];
}

const sendProtocolReminders = async () => {
  console.log(`[${new Date().toISOString()}] Running daily check for protocol reminders...`);

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const patientsWithActiveProtocols = await db.user.findMany({
      where: {
        role: 'PATIENT',
        protocolId: { not: null },
        protocolStartDate: { lte: today },
      },
      include: {
        protocol: true,
      },
    });

    console.log(`[LOG] Found ${patientsWithActiveProtocols.length} patients with active protocols.`);

    for (const patient of patientsWithActiveProtocols) {
      console.log(`[LOG] Checking patient: ${patient.name} (ID: ${patient.id})`);
      if (!patient.protocolStartDate || !patient.protocol || !patient.email) {
        console.log(`[LOG]  -> Skipping: missing protocol, start date, or email.`);
        continue;
      }

      const protocolStartDate = new Date(patient.protocolStartDate);
      protocolStartDate.setHours(0, 0, 0, 0);
      
      const diffTime = Math.abs(today.getTime() - protocolStartDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      console.log(`[LOG]  -> Protocol start date: ${protocolStartDate.toDateString()}`);
      console.log(`[LOG]  -> Today is day ${diffDays} of the protocol.`);

      const phases = patient.protocol.phases as unknown as Phase[];
      
      const todaysInjections = phases.flatMap(phase => 
        phase.injections.filter(injection => injection.dayOfPhase === diffDays)
      );

      console.log(`[LOG]  -> Found ${todaysInjections.length} injections for today.`);

      if (todaysInjections.length > 0) {
        console.log(`[LOG]  -> Preparing to send email to ${patient.email}...`);
        const medicationIds = todaysInjections.map(inj => inj.medicationId);
        const medications = await db.medication.findMany({
          where: { id: { in: medicationIds } },
        });
        const medicationMap = new Map(medications.map(m => [m.id, m.name]));

        const reminderHtml = `
          <h1>Your Daily Protocol Reminder</h1>
          <p>Hello ${patient.name},</p>
          <p>This is a reminder for your injections today:</p>
          <ul>
            ${todaysInjections.map(inj => `<li>Take ${inj.dosage} of ${medicationMap.get(inj.medicationId) || 'Medication'} at ${inj.time}</li>`).join('')}
          </ul>
          <p>Best regards,<br/>The AIVF Team</p>
        `;

        await sendMail({
          to: patient.email,
          subject: 'Your Daily AIVF Protocol Reminder',
          html: reminderHtml,
        });
      }
    }
  } catch (error) {
    console.error('Error sending protocol reminders:', error);
  }
};

// Schedule to run every day at 8:00 AM
cron.schedule('0 8 * * *', sendProtocolReminders);

console.log('Cron job for daily protocol reminders has been scheduled for 8:00 AM.'); 