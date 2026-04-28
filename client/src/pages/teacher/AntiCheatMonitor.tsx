import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { cheatApi, getServerOrigin } from '../../api';
import { cheatSocketStatusMessage, useCheatSocketStatus } from '../../hooks/useCheatSocketStatus';
import { getTeacherRole } from '../../utils/teacherRole';
import TeacherLanguageSwitch from '../../components/TeacherLanguageSwitch';
import { useTeacherLocale } from '../../i18n/TeacherLocaleContext';

const AntiCheatMonitor: React.FC = () => {
  const role = getTeacherRole();
  const { t } = useTeacherLocale();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const [monitorSocket, setMonitorSocket] = useState<Socket | null>(null);
  const wsStatus = useCheatSocketStatus(monitorSocket);

  const fetchAlerts = async () => {
    try {
      const res = await cheatApi.getAlerts();
      setAlerts(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchAlerts();

    // WS Connection
    const socket = io(`${getServerOrigin()}/cheat`, { transports: ['websocket'] });
    socketRef.current = socket;
    setMonitorSocket(socket);

    socket.on('connect', () => socket.emit('teacher:join'));

    socket.on('cheat:alert', () => {
      // Refresh list to get details
      fetchAlerts();
    });

    return () => {
      socket.disconnect();
      setMonitorSocket(null);
    };
  }, []);

  const handleResolve = async (logId: number, type: 'unlock' | 'terminate') => {
    try {
      if (type === 'unlock') {
        await cheatApi.unlock(logId);
        // WS notification is handled by server gateway, but we update UI
        socketRef.current?.emit('cheat:unlock', { logId, teacherId: JSON.parse(localStorage.getItem('teacher') || '{}').id });
      } else {
        await cheatApi.terminate(logId);
        socketRef.current?.emit('cheat:terminate', { logId, teacherId: JSON.parse(localStorage.getItem('teacher') || '{}').id });
      }
      setAlerts(prev => prev.filter(a => a.id !== logId));
    } catch { alert(role === 'teacher' ? t('cheat.resolveFailed') : '操作失敗'); }
  };

  return (
    <div>
      {role === 'teacher' && (
        <div className="flex justify-end mb-md">
          <TeacherLanguageSwitch compact />
        </div>
      )}
      <div
        role="status"
        data-testid="monitor-ws-status"
        className={`text-sm mb-md ${wsStatus === 'connected' ? 'text-secondary' : 'alert alert-warning'}`}
      >
        {cheatSocketStatusMessage(wsStatus, 'monitor')}
      </div>
      <div className="mb-lg">
        <h3>{role === 'teacher' ? t('cheat.title') : '防弊即時監控'}</h3>
        <p className="text-secondary text-sm">{role === 'teacher' ? t('cheat.subtitle') : '此處將顯示學生在考試中發生的異常操作（跳窗、切換分頁等）'}</p>
      </div>

      {loading ? <div className="spinner"></div> : alerts.length === 0 ? (
        <div className="card text-center py-3xl">
          <div className="flex justify-center text-success mb-md">
            <CheckCircle size={48} />
          </div>
          <p className="text-secondary mt-md">{role === 'teacher' ? t('cheat.empty') : '目前無待處理的異常事件'}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-md">
          {alerts.map((alert) => (
            <div key={alert.id} className="card border-l-4" style={{ borderLeft: '5px solid var(--color-danger)' }}>
              <div className="flex justify-between items-start flex-wrap gap-md">
                <div className="min-w-0">
                  <div className="action-group mb-sm">
                    <span className="badge badge-danger">{role === 'teacher' ? `${t('cheat.abnormalPrefix')}: ` : '異常：'}{
                      alert.eventType === 'tab_switch'
                        ? (role === 'teacher' ? t('cheat.tabSwitch') : '切換分頁')
                        : alert.eventType === 'window_blur'
                          ? (role === 'teacher' ? t('cheat.windowBlur') : '視窗失焦')
                          : alert.eventType === 'exit_fullscreen'
                            ? (role === 'teacher' ? t('cheat.exitFullscreen') : '退出全螢幕')
                            : alert.eventType === 'browser_back'
                              ? (role === 'teacher' ? t('cheat.browserBack') : '瀏覽器返回')
                              : (role === 'teacher' ? t('cheat.unknown') : '異常操作')
                    }</span>
                    <span className="text-xs text-secondary">{new Date(alert.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <h4 className="mb-xs">{alert.session.student.name} ({alert.session.student.studentId})</h4>
                  <p className="text-sm text-secondary">{role === 'teacher' ? `${t('cheat.exam')}: ` : '考卷：'}{alert.session.exam.title}</p>
                </div>
                <div className="card-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleResolve(alert.id, 'unlock')}
                  >{role === 'teacher' ? t('cheat.unlock') : '解除封鎖並恢復考試'}</button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleResolve(alert.id, 'terminate')}
                  >{role === 'teacher' ? t('cheat.terminate') : '強制結束考試'}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AntiCheatMonitor;
