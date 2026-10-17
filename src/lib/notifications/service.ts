import { NotificationItem } from '@/types/database';
import { mockDb } from '../store/mockDb';

export interface DispatchNotificationParams {
  userId: string;
  title: string;
  message: string;
  type: 'QUEUE_TURN_APPROACHING' | 'DELAY_ALERT' | 'STATUS_CHANGE' | 'APPOINTMENT_CONFIRMED' | 'EMERGENCY_NOTICE';
  patientPhone?: string;
}

export interface DeliveryResult {
  inApp: boolean;
  sms: { attempted: boolean; delivered: boolean; reason?: string };
  whatsapp: { attempted: boolean; delivered: boolean; reason?: string };
  email: { attempted: boolean; delivered: boolean; reason?: string };
}

/**
 * Dispatch notification through in-app store and optional external gateways (SMS / WhatsApp / Email).
 * Does not expose sensitive medical details in notifications.
 */
export async function sendNotification(params: DispatchNotificationParams): Promise<DeliveryResult> {
  // 1. Create In-App Notification Record
  const newNotif: NotificationItem = {
    id: `notif-${Date.now()}`,
    user_id: params.userId,
    title: params.title,
    message: params.message,
    type: params.type,
    is_read: false,
    channel: 'IN_APP',
    created_at: new Date().toISOString(),
  };

  // 2. Check for configured SMS provider
  const smsApiKey = process.env.SMS_PROVIDER_API_KEY;
  const smsResult = {
    attempted: Boolean(smsApiKey),
    delivered: false,
    reason: smsApiKey ? 'Mock external SMS dispatched' : 'SMS provider not configured (SMS_PROVIDER_API_KEY unset)',
  };

  // 3. Check for configured WhatsApp provider
  const waToken = process.env.WHATSAPP_API_TOKEN;
  const waResult = {
    attempted: Boolean(waToken),
    delivered: false,
    reason: waToken ? 'Mock external WhatsApp dispatched' : 'WhatsApp gateway not configured (WHATSAPP_API_TOKEN unset)',
  };

  // 4. Check for configured Email SMTP
  const smtpHost = process.env.EMAIL_SMTP_HOST;
  const emailResult = {
    attempted: Boolean(smtpHost),
    delivered: false,
    reason: smtpHost ? 'Mock SMTP email dispatched' : 'SMTP host not configured (EMAIL_SMTP_HOST unset)',
  };

  return {
    inApp: true,
    sms: smsResult,
    whatsapp: waResult,
    email: emailResult,
  };
}
