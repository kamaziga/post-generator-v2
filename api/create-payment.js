export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { amount, description } = req.body;
  const shopId = process.env.VITE_YOOKASSA_SHOP_ID;
  const secretKey = process.env.VITE_YOOKASSA_SECRET_KEY;

  if (!shopId || !secretKey) {
    return res.status(500).json({ error: 'ЮKassa keys not configured' });
  }

  const idempotenceKey = Date.now().toString();

  try {
    const response = await fetch('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${shopId}:${secretKey}`).toString('base64')}`,
        'Idempotence-Key': idempotenceKey
      },
      body: JSON.stringify({
        amount: { value: amount, currency: 'RUB' },
        capture: true,
        confirmation: {
          type: 'redirect',
          return_url: 'https://post-generator-v2.vercel.app/payment-success'
        },
        description: description
      })
    });

    const data = await response.json();
    if (data.confirmation && data.confirmation.confirmation_url) {
      return res.status(200).json({ confirmation_url: data.confirmation.confirmation_url });
    } else {
      console.error('ЮKassa error:', data);
      return res.status(500).json({ error: 'Payment creation failed', details: data });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}