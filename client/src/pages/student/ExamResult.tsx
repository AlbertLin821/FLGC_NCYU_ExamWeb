import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import Layout from '../../components/Layout';
import { useStudentLocale } from '../../i18n/StudentLocaleContext';

const ExamResult: React.FC = () => {
  const [showGradingNote, setShowGradingNote] = React.useState(false);
  const { t } = useStudentLocale();

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
        <div className="card modal-card modal-card--md text-center">
          <div className="flex justify-center text-success mb-lg">
            <CheckCircle size={64} />
          </div>
          <h2 className="mb-md" role="status">
            {t('result.title')}
          </h2>
          {showGradingNote ? (
            <p className="mb-lg text-lg" role="status">
              {t('result.submitted')}
            </p>
          ) : null}
          <p className="text-secondary mb-xl">{t('result.note')}</p>
          <div className="card-actions justify-center">
            <Link to="/student/exams" className="btn btn-primary">{t('result.backList')}</Link>
            <Link to="/" className="btn btn-secondary">{t('result.home')}</Link>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ExamResult;
