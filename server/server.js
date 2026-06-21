const express = require('express')
const cors = require('cors')
const app = express()
const port = 3001

app.use(cors())
app.use(express.json())

// ====== ДАННЫЕ YANDEX (из переменных окружения) ======
const YANDEX_API_KEY = process.env.YANDEX_API_KEY || ''
const FOLDER_ID = process.env.YANDEX_FOLDER_ID || ''
// ===============================

const YANDEX_API_URL = 'https://llm.api.cloud.yandex.net/foundationModels/v1/completion'

app.post('/generate', async (req, res) => {
  try {
    const { topic, instructions, index } = req.body

    const prompt = `Ты — профессиональный копирайтер для Telegram. Напиши пост на тему "${topic}". Инструкции пользователя: ${instructions || 'без дополнительных условий'}.

Пост должен быть:
- Полезным и интересным.
- С юмором (ирония, сарказм, шутки).
- С цифрами (где уместно).
- Грамматически правильным, без ошибок склонения.
- Логичным, связным, структурированным.
- Уникальным — не повторять идеи других постов в этой серии.

Формат: пост может быть личной историей, мифом vs реальностью, провокационным вопросом, списком с пояснениями, сравнением или шутливым советом.

Длина: 3-4 абзаца (каждый абзац — 1-2 предложения).

Ответ дай строго в JSON формате:
{
  "title": "Заголовок поста (должен привлекать внимание)",
  "text": ["Абзац 1", "Абзац 2", "Абзац 3"]
}
Без лишнего текста, только JSON.`

    const response = await fetch(YANDEX_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Api-Key ${YANDEX_API_KEY}`,
        'x-folder-id': FOLDER_ID
      },
      body: JSON.stringify({
        modelUri: `gpt://${FOLDER_ID}/yandexgpt-lite`,
        completionOptions: {
          stream: false,
          temperature: 0.7,
          maxTokens: 500
        },
        messages: [{ role: 'system', text: prompt }]
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      return res.status(response.status).json({ error: errorText })
    }

    const data = await response.json()
    const content = data.result.alternatives[0].message.text

    // Извлекаем JSON
    let clean = content.trim()
    clean = clean.replace(/```json\s*/g, '').replace(/```\s*/g, '')
    const start = clean.indexOf('{')
    if (start === -1) throw new Error('Нет объекта')
    clean = clean.substring(start)

    let braceCount = 0, end = -1
    for (let i = 0; i < clean.length; i++) {
      if (clean[i] === '{') braceCount++
      if (clean[i] === '}') {
        braceCount--
        if (braceCount === 0) { end = i + 1; break }
      }
    }
    if (end === -1) {
      clean = clean + '}'
      end = clean.length
    }
    clean = clean.substring(0, end)

    const parsed = JSON.parse(clean)
    res.json(parsed)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.listen(port, () => {
  console.log(`✅ Сервер запущен на http://localhost:${port}`)
})