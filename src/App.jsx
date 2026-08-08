import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generatePost } from '../generator';
import './Generator.css';

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

  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setPosts([]);

    const newPosts = [];
    for (let i = 0; i < 5; i++) {
      try {
        const text = await generatePost({ topic, style, instructions });
        newPosts.push({ id: Date.now() + i, text, number: i + 1 });
      } catch (e) {
        // одна попытка повтора при ошибке
        try {
          const text = await generatePost({ topic, style, instructions });
          newPosts.push({ id: Date.now() + i + 100, text, number: i + 1 });
        } catch (e2) {
          newPosts.push({
            id: Date.now() + i + 200,
            text: 'Не удалось сгенерировать уникальный пост. Попробуйте позже.',
            number: i + 1,
            error: true
          });
        }
      }
    }
    setPosts(newPosts);
    setLoading(false);
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
                <div className="post-content">{post.text}</div>
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