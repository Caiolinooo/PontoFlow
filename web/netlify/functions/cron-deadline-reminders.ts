import { schedule } from '@netlify/functions';

/**
 * Netlify Scheduled Function - Deadline Reminders
 * Runs every day at 9:00 AM UTC
 */
const handler = schedule('0 9 * * *', async () => {
  try {
    const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || 'http://localhost:3000';
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('[NETLIFY CRON] CRON_SECRET not configured');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'CRON_SECRET not configured' })
      };
    }

    console.log('[NETLIFY CRON] Calling deadline reminders endpoint...');

    const response = await fetch(`${baseUrl}/api/cron/deadline-reminders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    console.log('[NETLIFY CRON] Response:', data);

    return {
      statusCode: response.ok ? 200 : 500,
      body: JSON.stringify({
        success: response.ok,
        data
      })
    };
  } catch (error) {
    console.error('[NETLIFY CRON] Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
});

export { handler };
