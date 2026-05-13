import {Resend} from "resend";
import { env } from "./env";
import { string } from "zod";
import { logger } from "./logger";

const resend = new Resend(env.RESEND_API_KEY);
// ─── Base Email Sender ────────────────────────────────────────────────────────
// All emails in the app go through this function
// Centralized error handling and logging
export const sendEmail = async ({
    to,
    subject,
    html
}: {
    to: string;
    subject: string;
    html: string;
}): Promise<void> => {
    try {
        await resend.emails.send({
            from: 'Airbnb API <onboarding@resend.dev>', // use your domain in production
            to,
            subject,
            html
        });
        logger.info(`Email sent to ${to}: ${subject}`)
    } catch (error) {
        // Never throw email errors — email failure should not crash the app
    // Log and continue — user still registered/booked successfully
    logger.error(`Failed to send email to ${to}: ${error}`)
    }

    
}


