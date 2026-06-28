import { useState, useEffect, useRef } from 'react'
import { Helmet } from 'react-helmet-async'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import Rekvizity from './Rekvizity'
import Offer from './Offer'
import PaymentSuccess from './PaymentSuccess'

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || ''
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

const MIN_POST_LENGTH = 800
const MAX_POST_LENGTH = 1600
const FORBIDDEN_TOPICS = ['снег эскимосу', 'снег эскимосам', 'продать снег']

// ===== ЛИМИТ БЕСПЛАТНЫХ ПОСТОВ =====
const FREE_POSTS_PER_DAY = 5

const POPULAR_TOPICS = ['Маркетинг', 'Психология', 'Бизнес', 'Дизайн', 'Фитнес', 'Кулинария', 'Образование']

const DAILY_TIPS = [
  '📌 80% успеха поста — в первом предложении. Зацепи с первых слов!',
  '📌 Используй вопрос в конце поста — это увеличивает комментарии на 40%.',
  '📌 Оптимальная длина поста — 800–1200 символов. Коротко — не всегда эффективно.',
  '📌 Добавляй эмодзи — они повышают вовлечённость на 25%.',
  '📌 Публикуй посты в одно и то же время — алгоритмы это любят.',
]

const STYLES = {
  нейтральный: { label: 'Нейтральный', prompt: 'Пост должен быть универсальным...' },
  ироничный: { label: 'Ироничный', prompt: 'Используй сарказм, иронию, шутки...' },
  серьёзный: { label: 'Серьёзный', prompt: 'Пост должен быть строгим, фактологическим...' },
  вдохновляющий: { label: 'Вдохновляющий', prompt: 'Пост должен воодушевлять...' },
  деловой: { label: 'Деловой', prompt: 'Пост должен быть деловым, прагматичным...' },
  эмоциональный: { label: 'Эмоциональный', prompt: 'Пост должен быть насыщен эмоциями...' },
  краткий: { label: 'Краткий', prompt: 'Пост должен быть максимально сжатым...' },
  поэтичный: { label: 'Поэтичный', prompt: 'Пост должен быть поэтичным, образным...' },
}

// ===== ТАРИФЫ ДЛЯ ПОДПИСКИ =====
const PLANS = [
  {
    id: 'pro',
    name: 'PRO',
    price: '499',
    period: 'месяц',
    features: [
      '♾️ Безлимитная генерация постов',
      '🚀 Приоритетная очередь',
      '📅 Контент-план на месяц',
      '📊 Расширенная аналитика',
      '🖼️ Изображения к постам'
    ]
  },
  {
    id: 'business',
    name: 'BUSINESS',
    price: '999',
    period: 'месяц',
    features: [
      'Всё из PRO',
      '👥 Доступ для 5 пользователей',
      '📈 Экспорт в Google Docs',
      '🤖 ИИ-ассистент для идей'
    ]
  }
]

function MainApp() {
  // ===== СОСТОЯНИЯ =====
  const [topic, setTopic] = useState('')
  const [instructions, setInstructions] = useState('')
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(false)
  const [postCount, setPostCount] = useState(5)
  const [copiedId, setCopiedId] = useState(null)
  const [error, setError] = useState(null)
  const [tipIndex, setTipIndex] = useState(0)
  const [style, setStyle] = useState('нейтральный')
  const [showSettings, setShowSettings] = useState(false)
  const [botToken, setBotToken] = useState(() => localStorage.getItem('tg_bot_token') || '')
  const [chatId, setChatId] = useState(() => localStorage.getItem('tg_chat_id') || '')
  const [sending, setSending] = useState(false)
  const [sendStatus, setSendStatus] = useState(null)
  const [history, setHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
  const [sentPosts, setSentPosts] = useState(() => {
    const saved = localStorage.getItem('sent_posts')
    return saved ? JSON.parse(saved) : []
  })
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsError, setStatsError] = useState(null)
  const [totalViews, setTotalViews] = useState(0)

  // ===== ПОДПИСКА И ЛИМИТЫ =====
  const [generationCount, setGenerationCount] = useState(() => {
    const today = new Date().toDateString()
    const saved = localStorage.getItem('generation_data')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.date === today) {
          return parsed.count
        }
      } catch (e) {}
    }
    return 0
  })

  useEffect(() => {
    localStorage.setItem('generation_data', JSON.stringify({
      date: new Date().toDateString(),
      count: generationCount
    }))
  }, [generationCount])

  // ===== МОДАЛЬНОЕ ОКНО ПОДПИСКИ =====
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(null)

  // ===== ИИ-АССИСТЕНТ =====
  const [showIdeaAssistant, setShowIdeaAssistant] = useState(false)
  const [ideaMessages, setIdeaMessages] = useState([
    { role: 'assistant', content: '👋 Привет! Напиши тему, и я предложу 5 идей для постов.' }
  ])
  const [ideaInput, setIdeaInput] = useState('')
  const [ideaLoading, setIdeaLoading] = useState(false)
  const ideaChatRef = useRef(null)

  // ===== КОНТЕНТ-ПЛАН =====
  const [showContentPlan, setShowContentPlan] = useState(false)
  const [contentPlan, setContentPlan] = useState({})
  const [planMonth, setPlanMonth] = useState(new Date().getMonth())
  const [planYear, setPlanYear] = useState(new Date().getFullYear())
  const [planLoading, setPlanLoading] = useState(false)
  const [planResults, setPlanResults] = useState([])

  useEffect(() => {
    const saved = localStorage.getItem('content_plan')
    if (saved) {
      try { setContentPlan(JSON.parse(saved)) } catch (e) {}
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('content_plan', JSON.stringify(contentPlan))
  }, [contentPlan])

  // ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
  const getPageTitle = () => {
    if (topic.trim()) {
      return `Посты на тему "${topic}" — Генератор для Telegram`
    }
    return 'Генератор постов для Telegram — создавай контент легко'
  }

  const getMetaDescription = () => {
    if (posts.length > 0) {
      const firstPost = posts[0]
      const preview = firstPost.text.join(' ').slice(0, 150) + '...'
      return `Сгенерировано постов: ${posts.length}. Первый пост: "${firstPost.title}" — ${preview}`
    }
    return 'Генератор постов для Telegram. Создай качественный контент для своего канала за секунды.'
  }

  // ===== ЭФФЕКТЫ =====
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('sent_posts', JSON.stringify(sentPosts))
  }, [sentPosts])

  useEffect(() => {
    const total = sentPosts.reduce((acc, p) => acc + (p.views || 0), 0)
    setTotalViews(total)
  }, [sentPosts])

  useEffect(() => {
    const saved = localStorage.getItem('post_history')
    if (saved) {
      try { setHistory(JSON.parse(saved)) } catch (e) {}
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('post_history', JSON.stringify(history))
  }, [history])

  useEffect(() => {
    localStorage.setItem('tg_bot_token', botToken)
  }, [botToken])

  useEffect(() => {
    localStorage.setItem('tg_chat_id', chatId)
  }, [chatId])

  useEffect(() => {
    const day = new Date().getDate()
    setTipIndex(day % DAILY_TIPS.length)
  }, [])

  useEffect(() => {
    if (ideaChatRef.current) {
      ideaChatRef.current.scrollTop = ideaChatRef.current.scrollHeight
    }
  }, [ideaMessages])

  // ===== ОТПРАВКА В TELEGRAM =====
  const sendToTelegram = async (post) => {
    if (!botToken) {
      setSendStatus('❌ Сначала настрой бота (кнопка ⚙️)')
      setShowSettings(true)
      return
    }
    if (!chatId) {
      setSendStatus('❌ Укажи Chat ID в настройках')
      setShowSettings(true)
      return
    }

    const text = `📝 *${post.title}*\n\n${post.text.join('\n\n')}`

    setSending(true)
    setSendStatus(null)

    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'Markdown',
          disable_web_page_preview: true,
        }),
      })

      const data = await response.json()
      if (data.ok) {
        const newSent = {
          id: Date.now(),
          message_id: data.result.message_id,
          chat_id: chatId,
          topic: post.title,
          timestamp: new Date().toISOString(),
          views: 0,
        }
        setSentPosts(prev => [...prev, newSent])
        setSendStatus('✅ Пост отправлен в Telegram!')
        setTimeout(() => setSendStatus(null), 3000)
      } else {
        setSendStatus(`❌ Ошибка: ${data.description}`)
      }
    } catch (err) {
      setSendStatus(`❌ Ошибка: ${err.message}`)
    } finally {
      setSending(false)
    }
  }

  // ===== ОБНОВЛЕНИЕ СТАТИСТИКИ =====
  const updateStats = async () => {
    if (!botToken) {
      setStatsError('❌ Токен бота не настроен')
      return
    }
    if (sentPosts.length === 0) {
      setStatsError('📭 Нет отправленных постов для анализа')
      return
    }

    const isChannel = chatId.toString().startsWith('-100') || chatId.toString().startsWith('-')
    if (!isChannel) {
      setStatsError('⚠️ Статистика доступна только для каналов (Chat ID начинается с -100 или -)')
      return
    }

    setStatsLoading(true)
    setStatsError(null)

    const updatedPosts = []
    for (const sent of sentPosts) {
      try {
        const url = `https://api.telegram.org/bot${botToken}/getMessage?chat_id=${sent.chat_id}&message_id=${sent.message_id}`
        const response = await fetch(url)
        const data = await response.json()
        if (data.ok && data.result) {
          const views = data.result.views || 0
          updatedPosts.push({ ...sent, views })
        } else {
          updatedPosts.push(sent)
        }
      } catch (err) {
        console.error('Ошибка получения статистики:', err)
        updatedPosts.push(sent)
      }
    }
    setSentPosts(updatedPosts)
    setStatsLoading(false)
    setSendStatus('📊 Статистика обновлена!')
    setTimeout(() => setSendStatus(null), 3000)
  }

  // ===== ГЕНЕРАЦИЯ ИДЕЙ =====
  const generateIdeas = async (userTopic) => {
    if (!userTopic.trim()) return

    setIdeaMessages(prev => [...prev, { role: 'user', content: userTopic.trim() }])
    setIdeaInput('')
    setIdeaLoading(true)

    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`
        },
        body: JSON.stringify({
          model: 'deepseek/deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'Ты — креативный помощник. Сгенерируй 5 идей для постов на тему, которую напишет пользователь. Идеи должны быть конкретными, интересными, с разными углами. Ответ дай в виде нумерованного списка (1. ... 2. ... и т.д.). Без лишнего текста.'
            },
            {
              role: 'user',
              content: `Тема: ${userTopic.trim()}`
            }
          ],
          temperature: 0.9,
          max_tokens: 400
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      let content = data.choices[0].message.content

      setIdeaMessages(prev => [...prev, { role: 'assistant', content: content }])
    } catch (err) {
      console.error('Ошибка генерации идей:', err)
      setIdeaMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Не удалось сгенерировать идеи. Попробуйте позже или измените тему.'
      }])
    } finally {
      setIdeaLoading(false)
    }
  }

  // ===== ГЕНЕРАЦИЯ ОДНОГО ПОСТА =====
  const generateSinglePost = async (topic, instructions, index, usedTitles, usedThemes) => {
    const formats = [
      'личная история с неожиданным выводом',
      'миф vs реальность (опровержение стереотипа)',
      'провокационный вопрос + ироничный ответ',
      'список из 5 пунктов с развёрнутыми пояснениями (каждый пункт 2–3 предложения)',
      'сравнение (бизнес как спорт, как свидание, как кулинария)',
      'шутливый совет «как НЕ надо» с примерами',
      'диалог с вымышленным собеседником (клиент, коллега, босс)',
      'разбор реального кейса (можно вымышленного, но убедительного)'
    ]
    const selectedFormat = formats[index % formats.length]
    const stylePrompt = STYLES[style]?.prompt || STYLES['нейтральный'].prompt

    const systemPrompt = `Ты — профессиональный копирайтер для Telegram-каналов с 10-летним стажем. Отвечай строго на русском языке.

Твоя задача — сгенерировать **один уникальный, глубокий, цепляющий пост** на тему "${topic}". Инструкции пользователя: ${instructions || 'без дополнительных условий'}.

**Стиль поста:** ${STYLES[style]?.label || 'Нейтральный'}. ${stylePrompt}

**Жёсткие требования по стилю и грамматике:**

1. Избегай скобок внутри предложений — они портят ритм.
2. Не повторяй одни и те же слова в соседних предложениях.
3. Пиши кратко и ёмко. Длинные предложения разбивай на 2–3 коротких.
4. Юмор должен быть естественным.
5. Заголовок — без вопросительного знака, если это не вопрос. Максимум 8–10 слов.
6. Структура: вступление → основная часть → вывод.

**Формат поста (обязательно используй этот): ${selectedFormat}**

Ответ дай строго в JSON:
{
  "title": "Заголовок",
  "text": ["Абзац 1", "Абзац 2", "Абзац 3", "Абзац 4", "Абзац 5 (необязательно)"]
}
Без лишнего текста, только JSON.`

    const userPrompt = `Напиши пост #${index + 1} на тему "${topic}". Формат: ${selectedFormat}. Пост должен быть уникальным, с живыми примерами, без банальностей.`

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await fetch(OPENROUTER_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`
          },
          body: JSON.stringify({
            model: 'deepseek/deepseek-chat',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.95,
            max_tokens: 900
          })
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`HTTP error: ${response.status} - ${errorText}`)
        }

        const data = await response.json()
        let content = data.choices[0].message.content

        console.log(`=== Пост #${index + 1} (попытка ${attempt + 1}) ===`)
        console.log(content)

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
        if (!parsed.title || !parsed.text) throw new Error('Нет title или text')

        const fullText = parsed.title + ' ' + parsed.text.join(' ')
        if (fullText.length < MIN_POST_LENGTH || fullText.length > MAX_POST_LENGTH) {
          console.warn(`Пост не проходит по длине (${fullText.length} символов), повторяем...`)
          continue
        }

        const lowerText = fullText.toLowerCase()
        let hasForbidden = false
        for (const forbidden of FORBIDDEN_TOPICS) {
          if (lowerText.includes(forbidden.toLowerCase())) {
            hasForbidden = true
            break
          }
        }
        if (hasForbidden) {
          console.warn('Пост содержит запрещённую тему, повторяем...')
          continue
        }

        const titleLower = parsed.title.toLowerCase().trim()
        const textStart = parsed.text.join(' ').substring(0, 100).toLowerCase().trim()

        if (usedTitles.some(t => t === titleLower)) {
          console.warn('Заголовок повторяется, повторяем...')
          continue
        }
        if (usedThemes.some(t => t === textStart)) {
          console.warn('Текст слишком похож, повторяем...')
          continue
        }

        usedTitles.push(titleLower)
        usedThemes.push(textStart)

        return {
          id: index + 1,
          title: parsed.title,
          text: Array.isArray(parsed.text) ? parsed.text : [parsed.text]
        }
      } catch (err) {
        console.error(`Ошибка поста #${index + 1} (попытка ${attempt + 1}):`, err)
        if (attempt < 1) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        } else {
          return {
            id: index + 1,
            title: `Пост #${index + 1}`,
            text: ['Не удалось сгенерировать уникальный пост. Попробуйте позже.']
          }
        }
      }
    }
    return null
  }

  // ===== ГЕНЕРАЦИЯ ПОСТОВ =====
  const handleGenerate = async () => {
    if (!topic.trim()) return
    if (!OPENROUTER_API_KEY) {
      setError('API-ключ не найден.')
      return
    }

    // Проверка лимита
    const today = new Date().toDateString()
    const savedData = localStorage.getItem('generation_data')
    let count = 0
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData)
        if (parsed.date === today) {
          count = parsed.count
        }
      } catch (e) {}
    }

    // Пока все пользователи считаются бесплатными
    const isSubscribed = false

    if (!isSubscribed && count >= FREE_POSTS_PER_DAY) {
      setShowSubscriptionModal(true)
      return
    }

    setLoading(true)
    setPosts([])
    setError(null)

    try {
      const usedTitles = []
      const usedThemes = []
      const results = []
      for (let i = 0; i < postCount; i++) {
        const post = await generateSinglePost(topic.trim(), instructions, i, usedTitles, usedThemes)
        results.push(post)
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      const finalPosts = results.map((post, index) => {
        if (post) return post
        return {
          id: index + 1,
          title: `Пост #${index + 1}`,
          text: ['Не удалось сгенерировать этот пост. Попробуйте ещё раз.']
        }
      })

      setPosts(finalPosts)

      const newCount = count + 1
      setGenerationCount(newCount)

      if (finalPosts.length > 0 && finalPosts[0]?.title !== 'Пост #1') {
        const historyEntry = {
          id: Date.now(),
          topic: topic.trim(),
          style: STYLES[style]?.label || 'Нейтральный',
          posts: finalPosts,
          timestamp: new Date().toLocaleString()
        }
        setHistory(prev => [historyEntry, ...prev])
      }

    } catch (err) {
      console.error(err)
      setError('Ошибка генерации, попробуйте позже.')
    } finally {
      setLoading(false)
    }
  }

  // ===== КОНТЕНТ-ПЛАН =====
  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (month, year) => {
    return new Date(year, month, 1).getDay()
  }

  const updatePlanDay = (day, value) => {
    const key = `${planYear}-${String(planMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    setContentPlan(prev => {
      const newPlan = { ...prev }
      if (value.trim()) {
        newPlan[key] = value.trim()
      } else {
        delete newPlan[key]
      }
      return newPlan
    })
  }

  const getPlanDay = (day) => {
    const key = `${planYear}-${String(planMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return contentPlan[key] || ''
  }

  const generateAllPlanPosts = async () => {
    const days = getDaysInMonth(planMonth, planYear)
    const entries = []

    for (let day = 1; day <= days; day++) {
      const topic = getPlanDay(day)
      if (topic) {
        entries.push({ day, topic })
      }
    }

    if (entries.length === 0) {
      setSendStatus('❌ Нет тем для генерации. Заполни дни в календаре.')
      return
    }

    setPlanLoading(true)
    setPlanResults([])

    let allResults = []

    for (const entry of entries) {
      const usedTitles = []
      const usedThemes = []
      const posts = []
      for (let i = 0; i < 1; i++) {
        const post = await generateSinglePost(entry.topic, instructions, i, usedTitles, usedThemes)
        if (post) posts.push(post)
      }
      if (posts.length > 0) {
        allResults.push({
          day: entry.day,
          topic: entry.topic,
          posts: posts
        })
        const historyEntry = {
          id: Date.now() + entry.day,
          topic: entry.topic,
          style: STYLES[style]?.label || 'Нейтральный',
          posts: posts,
          timestamp: new Date().toLocaleString()
        }
        setHistory(prev => [historyEntry, ...prev])
      }
    }

    setPlanResults(allResults)
    setPlanLoading(false)
    setSendStatus(`✅ Сгенерировано ${allResults.length} постов для контент-плана!`)
    setTimeout(() => setSendStatus(null), 3000)
  }

  const clearPlan = () => {
    if (window.confirm('Очистить все темы в контент-плане?')) {
      setContentPlan({})
      setPlanResults([])
    }
  }

  const changeMonth = (delta) => {
    let newMonth = planMonth + delta
    let newYear = planYear
    if (newMonth > 11) { newMonth = 0; newYear++ }
    if (newMonth < 0) { newMonth = 11; newYear-- }
    setPlanMonth(newMonth)
    setPlanYear(newYear)
    setPlanResults([])
  }

  // ===== ОСТАЛЬНЫЕ ФУНКЦИИ =====
  const clearHistory = () => {
    if (window.confirm('Удалить всю историю генераций?')) {
      setHistory([])
    }
  }

  const loadHistoryPost = (entry) => {
    setPosts(entry.posts)
    setTopic(entry.topic)
    const foundStyle = Object.keys(STYLES).find(key => STYLES[key].label === entry.style)
    if (foundStyle) setStyle(foundStyle)
    setShowHistory(false)
  }

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleGenerate()
  }

  const handleCopy = (post) => {
    const text = post.title + '\n\n' + post.text.join('\n\n')
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(post.id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  const handleDoubleClick = (postId, paragraphIndex, e) => {
    const currentText = e.target.innerText
    const newText = prompt('Редактировать абзац:', currentText)
    if (newText !== null && newText.trim() !== '') {
      setPosts(prev =>
        prev.map(post =>
          post.id === postId
            ? {
                ...post,
                text: post.text.map((p, i) => (i === paragraphIndex ? newText.trim() : p))
              }
            : post
        )
      )
    }
  }

  const handleTopicClick = (topicName) => {
    setTopic(topicName)
  }

  const handleIdeaSend = () => {
    if (ideaInput.trim() && !ideaLoading) {
      generateIdeas(ideaInput)
    }
  }

  const insertIdea = (ideaText) => {
    const cleanIdea = ideaText.replace(/^\d+\.\s*/, '').trim()
    setTopic(cleanIdea)
    setShowIdeaAssistant(false)
  }

  // ===== ОПЛАТА (ЮKassa) =====
  const handleSubscribe = async (plan) => {
    const amount = plan.price;
    const description = `Подписка ${plan.name}`;

    try {
      const response = await fetch('/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, description })
      });
      const data = await response.json();
      if (data.confirmation_url) {
        window.location.href = data.confirmation_url;
      } else {
        alert('Ошибка при создании платежа: ' + (data.error || 'неизвестная ошибка'));
      }
    } catch (err) {
      console.error(err);
      alert('Не удалось подключиться к платежной системе');
    }
  };

  const openSubscription = () => {
    setShowSubscriptionModal(true)
  }

  const closeSubscription = () => {
    setShowSubscriptionModal(false)
    setSelectedPlan(null)
  }

  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
  const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

  return (
    <>
      <Helmet>
        <title>{getPageTitle()}</title>
        <meta name="description" content={getMetaDescription()} />
        <meta name="keywords" content="генератор постов, Telegram, контент для телеграм, идеи постов, копирайтинг, ИИ, нейросеть" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://post-generator-v2.vercel.app" />
        <meta property="og:title" content={getPageTitle()} />
        <meta property="og:description" content={getMetaDescription()} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://post-generator-v2.vercel.app" />
        <meta property="og:image" content="https://post-generator-v2.vercel.app/og-image.png" />
        <meta property="og:site_name" content="Генератор постов для Telegram" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={getPageTitle()} />
        <meta name="twitter:description" content={getMetaDescription()} />
        <meta name="twitter:image" content="https://post-generator-v2.vercel.app/og-image.png" />
        <html lang="ru" />
      </Helmet>

      <div className="app-wrapper">
        <div className="particles">
          <div className="particle" style={{ left: '10%', animationDelay: '0s' }}></div>
          <div className="particle" style={{ left: '20%', animationDelay: '2s' }}></div>
          <div className="particle" style={{ left: '30%', animationDelay: '4s' }}></div>
          <div className="particle" style={{ left: '40%', animationDelay: '6s' }}></div>
          <div className="particle" style={{ left: '50%', animationDelay: '8s' }}></div>
          <div className="particle" style={{ left: '60%', animationDelay: '10s' }}></div>
          <div className="particle" style={{ left: '70%', animationDelay: '12s' }}></div>
          <div className="particle" style={{ left: '80%', animationDelay: '14s' }}></div>
          <div className="particle" style={{ left: '90%', animationDelay: '16s' }}></div>
        </div>

        <div className="app-grid">
          <aside className="sidebar-left">
            <div className="sidebar-card">
              <h3>Популярные темы</h3>
              <ul>
                {POPULAR_TOPICS.map((t) => (
                  <li key={t} onClick={() => handleTopicClick(t)}>
                    <span className="topic-icon">✈️</span> {t}
                  </li>
                ))}
              </ul>
            </div>

            <div className="sidebar-card">
              <h3>Статистика</h3>
              <p>Всего генераций: <strong>{posts.length}</strong></p>
              <p>История: <strong>{history.length}</strong> записей</p>
              <p>Отправлено постов: <strong>{sentPosts.length}</strong></p>
              <p>Общий просмотров: <strong>{totalViews}</strong></p>
              <p>Бесплатных постов сегодня: <strong>{generationCount} / {FREE_POSTS_PER_DAY}</strong></p>
            </div>

            <div className="sidebar-card tools-card">
              <h3>Инструменты</h3>
              <div className="tools-group">
                <button className="tool-btn" onClick={() => setShowHistory(!showHistory)}>
                  📂 {history.length > 0 && <span className="badge">{history.length}</span>}
                  <span className="tool-label">История</span>
                </button>
                <button
                  className="tool-btn"
                  onClick={updateStats}
                  disabled={statsLoading || sentPosts.length === 0}
                >
                  📊
                  <span className="tool-label">{statsLoading ? '...' : 'Статистика'}</span>
                </button>
                <button className="tool-btn" onClick={() => setShowContentPlan(true)}>
                  📅
                  <span className="tool-label">Контент-план</span>
                </button>
              </div>
              {statsError && <p className="stats-error">{statsError}</p>}
            </div>
          </aside>

          <main className="main-content">
            <div className="header">
              <div className="telegram-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.02-.14-.05-.2-.07-.06-.18-.04-.25-.02-.1.02-1.7 1.08-4.8 3.17-.45.31-.86.46-1.23.45-.4-.01-1.17-.23-1.74-.42-.7-.23-1.25-.35-1.2-.74.03-.2.3-.41.84-.62l6.77-2.6c3.16-1.21 3.82-1.43 4.24-1.44.09 0 .29.02.42.13.11.09.14.21.15.33-.01.07.01.17-.02.31z" fill="currentColor"/>
                </svg>
              </div>
              <div>
                <h1>Генератор постов для Telegram</h1>
                <div className="subtitle">Создай контент для своего канала за секунды</div>
              </div>
              <button className="theme-toggle" onClick={toggleTheme} title="Переключить тему">
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
              <button className="settings-btn" onClick={() => setShowSettings(!showSettings)} title="Настройки Telegram бота">
                ⚙️
              </button>
              <button className="subscribe-header-btn" onClick={openSubscription} title="Подписка">
                💎
              </button>
            </div>

            {showSettings && (
              <div className="settings-panel">
                <h3>⚙️ Настройки Telegram бота</h3>
                <div className="settings-row">
                  <label>Токен бота (получи у @BotFather):</label>
                  <input type="text" className="input settings-input" placeholder="1234567890:ABCdefGHIjklMNO..." value={botToken} onChange={(e) => setBotToken(e.target.value)} />
                </div>
                <div className="settings-row">
                  <label>Chat ID (ID канала или личного чата):</label>
                  <input type="text" className="input settings-input" placeholder="-1001234567890 или 123456789" value={chatId} onChange={(e) => setChatId(e.target.value)} />
                </div>
                <div className="settings-hint">
                  💡 Как получить Chat ID: отправьте любое сообщение в канал, затем перейдите по ссылке <br/>
                  <code>https://api.telegram.org/bot{botToken || 'ТОКЕН'}/getUpdates</code> <br/>
                  и найдите поле <code>chat</code> → <code>id</code>.
                  {botToken && (
                    <a href={`https://api.telegram.org/bot${botToken}/getUpdates`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--link-color)', display: 'inline-block', marginTop: '6px' }}>
                      🔗 Проверить обновления
                    </a>
                  )}
                </div>
                <button className="btn settings-close" onClick={() => setShowSettings(false)}>Закрыть</button>
              </div>
            )}

            <div className="input-group">
              <input type="text" className="input" placeholder="Например: фитнес, маркетинг, психология..." value={topic} onChange={(e) => setTopic(e.target.value)} onKeyDown={handleKeyDown} />
              <button className="btn" onClick={handleGenerate} disabled={loading || !topic.trim()}>
                {loading ? 'Генерация...' : 'Сгенерировать'}
              </button>
              <button className="idea-btn" onClick={() => setShowIdeaAssistant(true)} title="Помощник идей">
                💡
              </button>
            </div>

            <div className="input-group">
              <input type="text" className="input" placeholder="Дополнительные инструкции (например: с юмором, с цифрами)" value={instructions} onChange={(e) => setInstructions(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleGenerate()} />
            </div>

            <div className="style-toggle">
              <span className="style-label">Стиль поста:</span>
              {Object.entries(STYLES).map(([key, val]) => (
                <button key={key} className={`style-btn ${style === key ? 'active' : ''}`} onClick={() => setStyle(key)}>
                  {val.label}
                </button>
              ))}
            </div>

            {error && <div className="error">{error}</div>}
            {loading && (
              <div className="loading">
                <div className="spinner"></div>
                <span>Генерируем идеи...</span>
              </div>
            )}
            {sendStatus && <div className={`send-status ${sendStatus.includes('✅') ? 'success' : 'error'}`}>{sendStatus}</div>}

            {showHistory && (
              <div className="history-panel">
                <h3>📂 История генераций</h3>
                {history.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>История пуста. Сгенерируйте первый пост!</p>
                ) : (
                  <div className="history-list">
                    {history.map((entry) => (
                      <div key={entry.id} className="history-item" onClick={() => loadHistoryPost(entry)}>
                        <div className="history-item-header">
                          <span className="history-topic">{entry.topic}</span>
                          <span className="history-style">{entry.style}</span>
                        </div>
                        <div className="history-meta">
                          <span className="history-time">{entry.timestamp}</span>
                          <span className="history-count">{entry.posts.length} постов</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button className="btn history-close" onClick={() => setShowHistory(false)}>Закрыть</button>
              </div>
            )}

            {posts.length > 0 && (
              <div className="posts">
                {posts.map((post, idx) => (
                  <div key={post.id} className="card" style={{ animationDelay: `${idx * 0.15}s` }}>
                    <div className="card-header">
                      <div className="card-number">#{post.id}</div>
                      <div className="card-actions">
                        <button className="copy-btn" onClick={() => handleCopy(post)} title="Копировать пост">
                          {copiedId === post.id ? '✓' : '📋'}
                        </button>
                        <button className="send-btn" onClick={() => sendToTelegram(post)} disabled={sending} title="Отправить в Telegram">
                          ✈️
                        </button>
                      </div>
                    </div>
                    {copiedId === post.id && <div className="copy-toast">Скопировано!</div>}
                    <h2 className="card-title">{post.title}</h2>
                    <div className="card-text">
                      {post.text.map((paragraph, idx) => (
                        <p key={idx} onDoubleClick={(e) => handleDoubleClick(post.id, idx, e)} style={{ cursor: 'pointer' }} title="Двойной клик для редактирования">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>

          <aside className="sidebar-right">
            <div className="sidebar-card">
              <h3>💡 Совет дня</h3>
              <p>{DAILY_TIPS[tipIndex]}</p>
            </div>
            <div className="sidebar-card" style={{ marginTop: '20px' }}>
              <h3>📢 Новости</h3>
              <p>✅ Автопостинг в Telegram уже работает!</p>
              <p style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '8px' }}>Настрой бота через ⚙️ в шапке</p>
              <p style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '4px' }}>📊 Аналитика вовлеченности доступна</p>
              <p style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '4px' }}>📅 Контент-план на месяц — планируй посты!</p>
            </div>
          </aside>
        </div>

        <footer className="footer">
          <Link to="/rekvizity" style={{ color: '#0088cc', textDecoration: 'none' }}>Реквизиты</Link>
          <span style={{ margin: '0 8px', color: 'rgba(255,255,255,0.2)' }}>|</span>
          <Link to="/offer" style={{ color: '#0088cc', textDecoration: 'none' }}>Оферта</Link>
          <br />
          Сделано с ❤️ для контент-менеджеров
        </footer>
      </div>

      {/* ===== МОДАЛЬНЫЕ ОКНА ===== */}
      {showIdeaAssistant && (
        <div className="modal-overlay" onClick={() => setShowIdeaAssistant(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>💡 Помощник идей</h3>
              <button className="modal-close" onClick={() => setShowIdeaAssistant(false)}>✕</button>
            </div>
            <div className="idea-chat" ref={ideaChatRef}>
              {ideaMessages.map((msg, idx) => (
                <div key={idx} className={`idea-message ${msg.role}`}>
                  <div className="idea-bubble">
                    {msg.content.split('\n').map((line, i) => {
                      if (/^\d+\.\s/.test(line)) {
                        return (
                          <div key={i} className="idea-option" onClick={() => insertIdea(line)}>
                            {line}
                          </div>
                        )
                      }
                      return <p key={i}>{line}</p>
                    })}
                  </div>
                </div>
              ))}
              {ideaLoading && (
                <div className="idea-message assistant">
                  <div className="idea-bubble">
                    <div className="typing-indicator">
                      <span></span><span></span><span></span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="idea-input-group">
              <input
                type="text"
                className="input"
                placeholder="Напиши тему для идей..."
                value={ideaInput}
                onChange={(e) => setIdeaInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleIdeaSend()}
                disabled={ideaLoading}
              />
              <button className="btn" onClick={handleIdeaSend} disabled={ideaLoading || !ideaInput.trim()}>
                {ideaLoading ? '...' : 'Отправить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showContentPlan && (
        <div className="modal-overlay" onClick={() => setShowContentPlan(false)}>
          <div className="modal-content plan-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📅 Контент-план на {monthNames[planMonth]} {planYear}</h3>
              <button className="modal-close" onClick={() => setShowContentPlan(false)}>✕</button>
            </div>
            <div className="plan-body">
              <div className="plan-nav">
                <button className="plan-nav-btn" onClick={() => changeMonth(-1)}>◀</button>
                <span className="plan-current">{monthNames[planMonth]} {planYear}</span>
                <button className="plan-nav-btn" onClick={() => changeMonth(1)}>▶</button>
              </div>
              <div className="plan-grid">
                {dayNames.map(day => (
                  <div key={day} className="plan-day-header">{day}</div>
                ))}
                {Array.from({ length: getFirstDayOfMonth(planMonth, planYear) === 0 ? 6 : getFirstDayOfMonth(planMonth, planYear) - 1 }).map((_, i) => (
                  <div key={`empty-${i}`} className="plan-day-empty"></div>
                ))}
                {Array.from({ length: getDaysInMonth(planMonth, planYear) }).map((_, i) => {
                  const day = i + 1
                  const topic = getPlanDay(day)
                  return (
                    <div key={day} className={`plan-day ${topic ? 'has-topic' : ''}`}>
                      <div className="plan-day-number">{day}</div>
                      <input
                        type="text"
                        className="plan-day-input"
                        placeholder="Тема"
                        value={topic}
                        onChange={(e) => updatePlanDay(day, e.target.value)}
                      />
                    </div>
                  )
                })}
              </div>
              <div className="plan-actions">
                <button className="btn plan-generate-btn" onClick={generateAllPlanPosts} disabled={planLoading}>
                  {planLoading ? 'Генерация...' : '🚀 Сгенерировать все'}
                </button>
                <button className="btn plan-clear-btn" onClick={clearPlan}>
                  🗑️ Очистить
                </button>
              </div>
              {planResults.length > 0 && (
                <div className="plan-results">
                  <h4>✅ Сгенерированные посты:</h4>
                  {planResults.map((res, idx) => (
                    <div key={idx} className="plan-result-item">
                      <div className="plan-result-day">День {res.day}: <strong>{res.topic}</strong></div>
                      {res.posts.map((post, pIdx) => (
                        <div key={pIdx} className="plan-result-post">
                          <span className="plan-result-title">{post.title}</span>
                          <button className="plan-result-copy" onClick={() => handleCopy(post)}>
                            📋
                          </button>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== МОДАЛЬНОЕ ОКНО ПОДПИСКИ ===== */}
      {showSubscriptionModal && (
        <div className="modal-overlay" onClick={closeSubscription}>
          <div className="modal-content subscription-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>💎 Выберите тариф</h3>
              <button className="modal-close" onClick={closeSubscription}>✕</button>
            </div>
            <div className="subscription-body">
              <div className="subscription-plans">
                {PLANS.map((plan) => (
                  <div key={plan.id} className={`subscription-plan ${plan.id === 'business' ? 'business' : ''}`}>
                    {plan.id === 'business' && <div className="popular-badge">🔥 Популярный</div>}
                    <h4>{plan.name}</h4>
                    <div className="subscription-price">{plan.price} ₽ <span>/ {plan.period}</span></div>
                    <ul>
                      {plan.features.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                    <button
                      className={`subscription-buy ${plan.id === 'business' ? 'gold' : ''}`}
                      onClick={() => handleSubscribe(plan)}
                    >
                      Оформить
                    </button>
                  </div>
                ))}
              </div>
              <p className="subscription-note">
                🔒 Безопасная оплата через ЮKassa. Деньги не списываются до подтверждения.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/rekvizity" element={<Rekvizity />} />
        <Route path="/offer" element={<Offer />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
      </Routes>
    </Router>
  )
}