import { appEvents, EMAIL_EVENTS } from './events';
import { drainDueEmailRetries, popEmailJob, processEmailJob } from './email';

const POLL_INTERVAL_MS = 5_000;
let workerStarted = false;
let processing = false;

const processNextJob = async () => {
  if (processing) return;
  processing = true;

  try {
    await drainDueEmailRetries();

    let job = await popEmailJob();
    while (job) {
      await processEmailJob(job);
      job = await popEmailJob();
    }
  } finally {
    processing = false;
  }
};

export const startEmailWorker = () => {
  if (workerStarted) return;
  workerStarted = true;

  appEvents.on(EMAIL_EVENTS.QUEUED, () => {
    void processNextJob();
  });

  setInterval(() => {
    void processNextJob();
  }, POLL_INTERVAL_MS);

  void processNextJob();
  console.log('Email worker started (event-driven with Redis retries)');
};
