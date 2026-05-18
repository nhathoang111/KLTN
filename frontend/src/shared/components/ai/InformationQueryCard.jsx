import React, { useState } from 'react';
import { Search } from 'lucide-react';
import api from '../../lib/api';
import './InformationQueryCard.css';

const InformationQueryCard = ({ className = '', variant = 'default' }) => {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');

  const queryInformation = async () => {
    try {
      const q = String(question || '').trim();
      setError('');
      setAnswer('');
      if (!q) {
        setError('Vui lòng nhập câu hỏi.');
        return;
      }
      setLoading(true);
      const res = await api.post('/ai/information-query', { question: q });
      const result = res?.data || {};
      if (result?.success === false) {
        setError(result?.answer || result?.message || 'Tra cứu thất bại');
        return;
      }
      setAnswer(String(result?.answer || '').trim());
    } catch (e) {
      const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Tra cứu thất bại';
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = variant === 'admin';
  const subtitle = isAdmin
    ? 'Hỏi nhanh dữ liệu toàn trường, lớp học, học sinh, điểm số, điểm danh và thời khóa biểu.'
    : 'Hỏi nhanh dữ liệu học sinh, lớp, điểm, điểm danh và thời khóa biểu.';
  const placeholder = isAdmin
    ? 'Ví dụ: Toàn trường có bao nhiêu học sinh? Lớp nào cần chú ý nhất? Danh sách học sinh lớp 10A1'
    : 'Ví dụ: 10A1 có mấy bạn yếu Toán? GVCN lớp 10A1 là ai?';

  return (
    <section className={`aiq-card ${className}`.trim()}>
      <div className="aiq-header">
        <div>
          <h3 className="aiq-title">AI Tra cứu thông tin</h3>
          <p className="aiq-subtitle">{subtitle}</p>
        </div>
      </div>

      <div className="aiq-row">
        <input
          className="aiq-input"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={placeholder}
          disabled={loading}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              queryInformation();
            }
          }}
        />
        <button
          type="button"
          className="aiq-btn"
          onClick={queryInformation}
          disabled={loading}
        >
          <Search className="aiq-btn-icon" />
          <span>{loading ? 'Đang tra cứu...' : 'Tra cứu'}</span>
        </button>
      </div>

      {error && <div className="aiq-error">{error}</div>}
      {answer && <div className="aiq-answer">{answer}</div>}
    </section>
  );
};

export default InformationQueryCard;
