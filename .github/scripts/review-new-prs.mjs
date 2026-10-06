const required = [
  'GITHUB_TOKEN',
  'OPENAI_API_KEY',
  'GOOGLE_CHAT_WEBHOOK_URL',
];

for (const name of required) {
  if (!process.env[name]) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
const apiBase = `https://api.github.com/repos/${owner}/${repo}`;
const sentLabel = 'course-review-sent';

async function github(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...options.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub request failed (${response.status}): ${await response.text()}`);
  }
  return response;
}

async function ensureSentLabel() {
  const labelPath = `/labels/${encodeURIComponent(sentLabel)}`;
  const label = await fetch(`${apiBase}${labelPath}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (label.ok) return;
  if (label.status !== 404) {
    throw new Error(`Cannot check label (${label.status}): ${await label.text()}`);
  }

  await github('/labels', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: sentLabel,
      color: '0E8A16',
      description: 'A review message for this pull request was sent to Google Chat.',
    }),
  });
}

async function makeReview(pr, diff) {
  const prompt = `คุณเป็นผู้ช่วยรีวิวโค้ดสำหรับทีมเรียนเขียนโปรแกรม
เขียนรีวิวภาษาไทยสำหรับ Pull Request นี้ โดยใช้คำง่าย กระชับ และสุภาพแบบใส่ใจ
ให้เริ่มด้วยสิ่งที่ตรวจหรือสิ่งที่ทำได้ดีเมื่อมีหลักฐาน จากนั้นบอกเฉพาะปัญหาสำคัญจริง ๆ พร้อมผลกระทบและสิ่งที่ควรทำต่อ
หากไม่พบปัญหาสำคัญ ให้บอกชัดเจนว่าไม่พบ และอาจแนะนำการตรวจครั้งสุดท้ายเพียงหนึ่งข้อ
ห้ามใช้คำยากหรือศัพท์เทคนิคมากเกินไป ห้ามกล่าวถึงว่าคุณเป็น AI ห้ามใช้ Markdown heading
ความยาวไม่เกิน 140 คำ

PR #${pr.number}: ${pr.title}
รายละเอียด: ${pr.body || '(ไม่มีรายละเอียด)'}
โค้ดที่เปลี่ยน:
${diff}`;

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-5-mini',
      input: prompt,
      max_output_tokens: 450,
    }),
  });
  if (!response.ok) {
    throw new Error(`OpenAI request failed (${response.status}): ${await response.text()}`);
  }

  const result = await response.json();
  if (!result.output_text?.trim()) {
    throw new Error('OpenAI returned an empty review.');
  }
  return result.output_text.trim();
}

async function sendToGoogleChat(text) {
  const response = await fetch(process.env.GOOGLE_CHAT_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) {
    throw new Error(`Google Chat webhook failed (${response.status}): ${await response.text()}`);
  }
}

await ensureSentLabel();
const pullRequests = await (await github('/pulls?state=open&per_page=100')).json();
const pending = pullRequests.filter((pr) =>
  !pr.labels.some((label) => label.name === sentLabel),
);

if (pending.length === 0) {
  console.log('No pull requests need a first review.');
  process.exit(0);
}

for (const pr of pending) {
  const diffResponse = await github(`/pulls/${pr.number}`, {
    headers: { Accept: 'application/vnd.github.v3.diff' },
  });
  // Keep the request within a predictable size while retaining the first changed files.
  const diff = (await diffResponse.text()).slice(0, 60_000);
  const review = await makeReview(pr, diff);
  await sendToGoogleChat(`📌 รีวิว PR #${pr.number}: ${pr.title}\n\n${review}`);
  await github(`/issues/${pr.number}/labels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ labels: [sentLabel] }),
  });
  console.log(`Sent and marked PR #${pr.number}.`);
}
