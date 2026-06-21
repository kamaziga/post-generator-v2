export default function Rekvizity() {
  return (
    <div style={{ padding: '40px 20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Реквизиты самозанятого</h1>
      <p><strong>ФИО:</strong> Зиганшин Камиль Русланович</p>
      <p><strong>ИНН:</strong> 026490974540</p>
      <p><strong>ОГРНИП:</strong> Самозанятый, ОГРНИП не присвоен</p>
      <p><strong>Статус:</strong> Самозанятый (налог на профессиональный доход)</p>
      <p><strong>Сайт:</strong> <a href="https://post-generator-v2.vercel.app">https://post-generator-v2.vercel.app</a></p>
      <p><strong>Email:</strong> Pskaamill@mail.ru</p>
      <p><strong>Дата:</strong> {new Date().toLocaleDateString()}</p>
      <p style={{ marginTop: '20px', fontSize: '0.8rem', color: '#666' }}>Все реквизиты указаны в соответствии с действующим законодательством РФ.</p>
    </div>
  )
}