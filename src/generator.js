import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './Generator.css';

const API_KEY = import.meta.env.VITE_AGNES_API_KEY;

const TOPICS = [
  'маркетинг', 'бизнес', 'здоровье', 'психология',
  'фитнес', 'финансы', 'еда', 'путешествия',
  'технологии', 'мода', 'образование', 'юмор'
];

const STYLES = [
  'Нейтральный', 'Ироничный', 'Серьёзный',
  'Вдохновляющий', 'Деловой', 'Эмоциональный',
  'Краткий', 'Поэтичный'
];

function Generator() {
  const [topic, setTopic] = useState('');
  const [style, setStyle] = useState('Нейтральный');
  const [instructions, setInstructions] = useState('');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const parsePostsFromContent = (content) => {
    const markdownMatch = content.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
    const jsonString = markdownMatch ? markdownMatch[1] : content;

    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed)) return parsed;
      if (parsed.posts && Array.isArray(parsed.posts)) return parsed.posts;
      return [parsed];
    } catch (e) {
      const arrayMatch = content.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        return JSON.parse(arrayMatch[0]);
      }
      throw new Error('Invalid JSON format');
    }
  };

  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError('');
    setPosts([]);

    try {
      const response = await fetch('https://apihub.agnes-ai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: 'agnes-2.0-flash',
          messages: [
            {
              role: 'system',
              content: `Ты — эксперт по написанию постов для Telegram. Стиль: ${style}. ${instructions ? 'Дополнительные инструкции: ' + instructions : ''} Ты генерируешь посты на любую тему. Пост должен быть интересным, полезным, содержать заголовок и 3-4 абзаца текста. Твои тексты грамотные, без ошибок, привлекательные. Формат ответа: массив из 5 объектов, каждый с полями title и text (массив строк).`
            },
            {
              role: 'user',
              content: `Напиши 5 постов на тему "${topic}"`
            }
          ],
          temperature: 0.8,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', errorData);
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('Empty response from API');
      }

      const parsedPosts = parsePostsFromContent(content);

      const normalizedPosts = parsedPosts.map((post, idx) => ({
        id: Date.now() + idx,
        number: idx + 1,
        text: `${post.title || `Пост ${idx + 1}`}\n\n${Array.isArray(post.text) ? post.text.join('\n\n') : post.text || ''}`,
        error: false
      }));

      setPosts(normalizedPosts);
    } catch (err) {
      console.error('Generation error:', err);
      setError('Не удалось сгенерировать, попробуйте позже');
    } finally {
      setLoading(false);
    }
  }, [topic, style, instructions]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="generator-container">
      <header className="generator-header">
        <h1>Генератор постов для Telegram</h1>
        <p>Создай контент для своего канала за секунды</p>
      </header>

      <div className="generator-controls">
        <div className="input-group">
          <label>Тема поста</label>
          <input
            type="text"
            placeholder="Например: фитнес, бизнес, психология..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
          <div className="topic-suggestions">
            {TOPICS.map((t) => (
              <button key={t} onClick={() => setTopic(t)} className={`tag ${topic === t ? 'active' : ''}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="input-group">
          <label>Стиль поста</label>
          <div className="style-options">
            {STYLES.map((s) => (
              <button key={s} onClick={() => setStyle(s)} className={`style-btn ${style === s ? 'active' : ''}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="input-group">
          <label>Дополнительные инструкции (необязательно)</label>
          <input
            type="text"
            placeholder="Например: с юмором, с цифрами, с призывом к действию"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
        </div>

        <motion.button
          className="generate-btn"
          onClick={handleGenerate}
          disabled={loading || !topic.trim()}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {loading ? 'Генерирую...' : 'Сгенерировать'}
        </motion.button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <AnimatePresence>
        {posts.length > 0 && (
          <motion.div
            className="posts-results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {posts.map((post) => (
              <motion.div
                key={post.id}
                className={`post-card ${post.error ? 'error' : ''}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: post.number * 0.1 }}
              >
                <div className="post-header">
                  <span className="post-number">#{post.number}</span>
                  <div className="post-actions">
                    <button onClick={() => copyToClipboard(post.text)} title="Копировать">
                      📋
                    </button>
                    {post.text.length > 0 && (
                      <button
                        onClick={() => {
                          window.open(`https://t.me/share/url?url=${encodeURIComponent(post.text)}`, '_blank');
                        }}
                        title="Поделиться в Telegram"
                      >
                        ✈️
                      </button>
                    )}
                  </div>
                </div>
                <div className="post-content" style={{ whiteSpace: 'pre-line' }}>{post.text}</div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="generator-footer">
        <p>💡 Совет дня</p>
        <p>📌 Добавляй эмодзи — они повышают вовлечённость на 25%.</p>
        <p>📢 Новости</p>
        <p>✅ Автопостинг в Telegram уже работает!</p>
        <p>Настрой бота через ⚙️ в шапке</p>
        <p>📊 Аналитика вовлеченности доступна</p>
        <p>📅 Контент-план на месяц — планируй посты!</p>
        <p><a href="/offer">Реквизиты|Оферта</a></p>
        <p>Сделано с ❤️ для контент-менеджеров</p>
      </footer>
    </div>
  );
}

export default Generator;