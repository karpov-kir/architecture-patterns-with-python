import { EmailServicePort } from '../ports/EmailServicePort';

export class JustLogEmailService implements EmailServicePort {
  public sentEmails: { to: string; body: string }[] = [];

  public async sendEmail(to: string, emailBody: string) {
    // Simulate a little delay, like would happen in a real email service.
    await new Promise((resolve) => setTimeout(resolve, 200));

    console.log('##SENDING EMAIL START##');
    console.log('Sending email to:', to);
    console.log('##BODY START##');
    console.log(emailBody);
    console.log('##BODY END##');
    console.log('##SENDING EMAIL END##');

    this.sentEmails.push({ to, body: emailBody });
  }
}
