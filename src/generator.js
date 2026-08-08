import { db, auth } from './firebase';

// ⚠️ Внимание: этот файл создан для владельца сайта — все проверки отключены.
// Ты можешь генерировать посты без ограничений.

export async function generatePost(params, user) {
  const { topic, style, instructions } = params;
  const prompt = `Напиши пост для Telegram на тему "${topic}". Стиль: ${style || 'нейтральный'}. ${instructions ? 'Дополнительные указания: ' + instructions : ''}. Пост должен быть на русском языке, содержать от 150 до 300 слов, быть структурированным и увлекательным.`;

  const response = await fetch('https://post-generator-proxy.onrender.com/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.REACT_APP_OPENROUTER_API_KEY || ''}`
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-pro-exp-03-25:free',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 1024
    })
  });

  if (!response.ok) {
    throw new Error('Ошибка нейросети. Попробуйте позже.');
  }

  const data = await response.json();
  let generatedText = data.choices?.[0]?.message?.content?.trim() || data.choices?.[0]?.text?.trim() || '';

  if (!generatedText) {
    throw new Error('Не удалось получить ответ. Измените тему или стиль.');
  }

  return generatedText;
}