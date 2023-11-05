export interface EmailServicePort {
  sendEmail(to: string, emailBody: string): Promise<void>;
}
