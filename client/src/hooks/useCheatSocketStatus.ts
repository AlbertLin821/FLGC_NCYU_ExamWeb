import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';

export type CheatSocketStatus = 'connected' | 'reconnecting' | 'disconnected';

/**
 * 考場／防弊監控 WebSocket 連線狀態（不影響作答主流程，僅供提示）。
 */
export function useCheatSocketStatus(socket: Socket | null): CheatSocketStatus {
  const [status, setStatus] = useState<CheatSocketStatus>('disconnected');

  useEffect(() => {
    if (!socket) {
      setStatus('disconnected');
      return;
    }

    const onConnect = () => setStatus('connected');
    const onDisconnect = (reason: string) => {
      if (reason === 'io client disconnect') {
        setStatus('disconnected');
      } else {
        setStatus('reconnecting');
      }
    };
    const onReconnectAttempt = () => setStatus('reconnecting');
    const onConnectError = () => setStatus('reconnecting');
    const onReconnect = () => setStatus('connected');

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.io.on('reconnect_attempt', onReconnectAttempt);
    socket.io.on('reconnect', onReconnect);

    setStatus(socket.connected ? 'connected' : 'reconnecting');

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.io.off('reconnect_attempt', onReconnectAttempt);
      socket.io.off('reconnect', onReconnect);
    };
  }, [socket]);

  return status;
}

export function cheatSocketStatusMessage(
  status: CheatSocketStatus,
  context: 'exam' | 'monitor',
): string {
  const prefix = context === 'exam' ? '考場即時連線' : '防弊監控連線';
  if (status === 'connected') {
    return `${prefix}：已連線`;
  }
  if (status === 'reconnecting') {
    return `${prefix}：重新連線中（事件通報可能延遲）`;
  }
  return `${prefix}：無法連線（即時通報可能無法送出）`;
}
