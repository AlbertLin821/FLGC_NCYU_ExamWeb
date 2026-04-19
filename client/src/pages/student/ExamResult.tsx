import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import Layout from '../../components/Layout';

const ExamResult: React.FC = () => {
  const [showGradingNote, setShowGradingNote] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = sessionStorage.getItem('examSubmitMeta');
      if (raw) {
        setShowGradingNote(true);
        sessionStorage.removeItem('examSubmitMeta');
      }
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center mt-3xl">
        <div className="card text-center" style={{ maxWidth: '600px' }}>
          <div className="flex justify-center text-success mb-lg">
            <CheckCircle size={64} />
          </div>
          <h2 className="mb-md" role="status">
            測驗已提交成功
          </h2>
          {showGradingNote ? (
            <p className="mb-lg text-lg" role="status">
              答卷已送出
            </p>
          ) : null}
          <p className="text-secondary mb-xl">請靜候老師公布最後成績；如有疑問請洽監考老師。</p>
          <div className="flex gap-md justify-center">
            <Link to="/student/exams" className="btn btn-primary">返回考卷列表</Link>
            <Link to="/" className="btn btn-secondary">回到首頁</Link>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ExamResult;
