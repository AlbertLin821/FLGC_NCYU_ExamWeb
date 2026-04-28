import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';

export type CheatSocketStatus = 'connected' | 'reconnecting' | 'disconnected';

/**
 * 考場／防弊監控 WebSocket 連線狀態（不影響作答主流程，僅供提示）。
 */
export function useCheatSocketStatus(socket: Socket | null): CheatSocketStatus {
  const [status, setStatus] = useState<CheatSocketStatus>('disconnected');
  const [hadSuccessfulConnect, setHadSuccessfulConnect] = useState(false);

  useEffect(() => {
    if (!socket) {
      setStatus('disconnected');
      setHadSuccessfulConnect(false);
      return;
    }

    const onConnect = () => {
      setHadSuccessfulConnect(true);
      setStatus('connected');
    };
    const onDisconnect = (reason: string) => {
      if (reason === 'io client disconnect') {
        setStatus('disconnected');
      } else {
        setStatus(hadSuccessfulConnect ? 'reconnecting' : 'disconnected');
      }
    };
    const onReconnectAttempt = () => setStatus('reconnecting');
    const onConnectError = () => setStatus(hadSuccessfulConnect ? 'reconnecting' : 'disconnected');
    const onReconnect = () => {
      setHadSuccessfulConnect(true);
      setStatus('connected');
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.io.on('reconnect_attempt', onReconnectAttempt);
    socket.io.on('reconnect', onReconnect);

    setStatus(socket.connected ? 'connected' : 'disconnected');

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.io.off('reconnect_attempt', onReconnectAttempt);
      socket.io.off('reconnect', onReconnect);
    };
  }, [socket, hadSuccessfulConnect]);

  return status;
}

export function cheatSocketStatusMessage(
  status: CheatSocketStatus,
  context: 'exam' | 'monitor',
  locale: 'zh-TW' | 'en' = 'zh-TW',
): string {
  const isEnglish = locale === 'en';
  const prefix = context === 'exam'
    ? (isEnglish ? 'Live exam connection' : '考場即時連線')
    : (isEnglish ? 'Cheat monitor connection' : '防弊監控連線');
  if (status === 'connected') {
    return isEnglish ? `${prefix}: connected` : `${prefix}：已連線`;
  }
  if (status === 'reconnecting') {
    return isEnglish
      ? `${prefix}: reconnecting (alerts may be delayed)`
      : `${prefix}：重新連線中（事件通報可能延遲）`;
  }
  return isEnglish
    ? `${prefix}: offline (live alerts may not be sent)`
    : `${prefix}：無法連線（即時通報可能無法送出）`;
}
